import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const RunSchema = z.object({
  productId: z.string().min(1),
  targetType: z
    .enum(["cslb_adu_builders", "permit_expediters", "small_gcs"])
    .default("cslb_adu_builders"),
  state: z.string().min(2).max(2).default("CA"),
  city: z.string().max(100).nullable().optional(),
  limit: z.number().int().min(1).max(500).default(20),
});

const CITIES = [
  "los-angeles-ca",
  "san-jose-ca",
  "san-francisco-ca",
  "san-diego-ca",
  "sacramento-ca",
  "oakland-ca",
  "anaheim-ca",
  "irvine-ca",
];

// Plain display names aligned 1:1 with CITIES above, used for Google Places queries.
const CITY_DISPLAY: Record<string, string> = {
  "los-angeles-ca": "Los Angeles",
  "san-jose-ca": "San Jose",
  "san-francisco-ca": "San Francisco",
  "san-diego-ca": "San Diego",
  "sacramento-ca": "Sacramento",
  "oakland-ca": "Oakland",
  "anaheim-ca": "Anaheim",
  "irvine-ca": "Irvine",
};

const SEARCHES = ["general-contractors", "adu-construction"];

const GOOGLE_PLACES_PER_CITY = 10;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface ScrapedLead {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  source: string;
  sourceUrl: string;
  searchQuery: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scrapeYellowPages(
  city: string,
  query: string
): Promise<ScrapedLead[]> {
  const url = `https://www.yellowpages.com/${city}/${query}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const names = Array.from(
    html.matchAll(/class="business-name"[^>]*>.*?<[^>]*>([^<]+)</g),
    (m) => m[1].trim()
  );
  const phones = Array.from(
    html.matchAll(/class="phones[^"]*"[^>]*>([^<]+)</g),
    (m) => m[1].trim()
  );
  const addresses = Array.from(
    html.matchAll(/class="street-address"[^>]*>([^<]+)</g),
    (m) => m[1].trim()
  );
  const localities = Array.from(
    html.matchAll(/class="locality"[^>]*>([^<]+)</g),
    (m) => m[1].trim()
  );

  return names.map((name, i) => ({
    name,
    phone: phones[i] || "",
    address: addresses[i] || "",
    city: localities[i]?.replace(/,.*/, "").trim() || city.split("-")[0],
    state: "CA",
    source: "yellowpages",
    sourceUrl: `yellowpages://${city}/${query}/${name
      .toLowerCase()
      .replace(/\s+/g, "-")}`,
    searchQuery: query,
  }));
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
}

interface GooglePlacesResponse {
  status: string;
  results?: GooglePlace[];
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: { formatted_phone_number?: string };
}

async function searchGooglePlaces(
  citySlug: string,
  apiKey: string
): Promise<ScrapedLead[]> {
  const cityName = CITY_DISPLAY[citySlug] ?? citySlug;
  const query = `ADU builder ${cityName} CA`;
  const searchUrl =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(searchUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as GooglePlacesResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(
      `[scout/run] google places status=${data.status} city=${citySlug}`,
      data.error_message ?? ""
    );
    return [];
  }
  const places = (data.results ?? []).slice(0, GOOGLE_PLACES_PER_CITY);

  const leads: ScrapedLead[] = [];
  for (const place of places) {
    // Place Details call — required for phone number (not in Text Search payload).
    let phone = "";
    try {
      const detailsUrl =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(place.place_id)}` +
        `&fields=formatted_phone_number` +
        `&key=${encodeURIComponent(apiKey)}`;
      const dres = await fetch(detailsUrl);
      if (dres.ok) {
        const ddata = (await dres.json()) as GooglePlaceDetailsResponse;
        phone = ddata.result?.formatted_phone_number ?? "";
      }
    } catch (err) {
      console.warn(
        "[scout/run] google details failed:",
        err instanceof Error ? err.message : err
      );
    }
    // Gentle pacing — Places default QPS is 10/sec.
    await sleep(150);

    leads.push({
      name: place.name,
      phone,
      address: place.formatted_address ?? "",
      city: cityName,
      state: "CA",
      source: "google_places",
      sourceUrl: `google-places://${place.place_id}`,
      searchQuery: "adu-builder",
    });
  }
  return leads;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = RunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, targetType, state, city, limit } = parsed.data;

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Purge legacy mock leads from earlier versions of this endpoint.
    await db.lead.deleteMany({ where: { source: "cslb_mock" } });

    const localJob = await db.scoutJob.create({
      data: {
        productId,
        targetType,
        state,
        city: city ?? null,
        limitCount: limit,
        status: "running",
      },
    });

    // ── Source selection: Google Places (preferred) → YellowPages fallback ─
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const sourceUsed: "google_places" | "yellowpages" = googleKey
      ? "google_places"
      : "yellowpages";

    const chosenCities = pickRandom(CITIES, 3);
    const allLeads: ScrapedLead[] = [];
    const citiesScraped: string[] = [];
    let successfulRequests = 0;
    let totalRequests = 0;

    if (googleKey) {
      for (const gCity of chosenCities) {
        totalRequests++;
        try {
          const leads = await searchGooglePlaces(gCity, googleKey);
          if (leads.length > 0) {
            allLeads.push(...leads);
            citiesScraped.push(gCity);
            successfulRequests++;
          }
        } catch (err) {
          console.warn(
            `[scout/run] google places failed ${gCity}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    } else {
      let firstRequest = true;
      for (const yCity of chosenCities) {
        let cityHadResults = false;
        for (const query of SEARCHES) {
          if (!firstRequest) await sleep(2000);
          firstRequest = false;
          totalRequests++;
          try {
            const leads = await scrapeYellowPages(yCity, query);
            if (leads.length > 0) {
              allLeads.push(...leads);
              cityHadResults = true;
              successfulRequests++;
            }
          } catch (err) {
            console.warn(
              `[scout/run] scrape failed ${yCity}/${query}:`,
              err instanceof Error ? err.message : err
            );
          }
        }
        if (cityHadResults) citiesScraped.push(yCity);
      }
    }

    if (successfulRequests === 0) {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: { status: "failed", completedAt: new Date() },
      });
      return NextResponse.json(
        {
          success: false,
          error:
            sourceUsed === "google_places"
              ? "Google Places unavailable"
              : "YellowPages unavailable",
        },
        { status: 503 }
      );
    }

    // Dedup within batch by sourceUrl
    const seen = new Set<string>();
    const unique = allLeads.filter((l) => {
      if (seen.has(l.sourceUrl)) return false;
      seen.add(l.sourceUrl);
      return true;
    });

    // ── Insert with dedup against DB ───────────────────────────────────────
    let inserted = 0;
    let duplicatesSkipped = 0;
    const scrapedAt = new Date().toISOString();

    for (const lead of unique.slice(0, limit)) {
      try {
        await db.lead.create({
          data: {
            productId,
            source: sourceUsed,
            sourceUrl: lead.sourceUrl,
            name: lead.name,
            email: null,
            company: lead.name,
            role: "Owner / Operator",
            city: lead.city,
            state: lead.state,
            status: "new",
            enrichmentJson: {
              phone: lead.phone,
              address: lead.address,
              data_source: sourceUsed,
              scraped_at: scrapedAt,
              search_query: lead.searchQuery,
              target_type: targetType,
            },
          },
        });
        inserted++;
      } catch (err) {
        if (err instanceof Error && err.message.includes("P2002")) {
          duplicatesSkipped++;
          continue;
        }
        console.warn(
          "[scout/run] insert skipped:",
          err instanceof Error ? err.message : err
        );
      }
    }

    await db.scoutJob.update({
      where: { id: localJob.id },
      data: {
        status: "done",
        resultsCount: inserted,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      jobId: localJob.id,
      status: "done",
      leadsCreated: inserted,
      duplicatesSkipped,
      source: sourceUsed,
      citiesScraped,
      requestsMade: totalRequests,
      successfulRequests,
    });
  } catch (err) {
    console.error("[scout/run] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
