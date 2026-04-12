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
  searchQuery: z.string().trim().min(1).max(200).optional(),
});

const CITIES = [
  "Los Angeles",
  "San Jose",
  "San Francisco",
  "San Diego",
  "Sacramento",
  "Oakland",
  "Anaheim",
  "Irvine",
  "Fremont",
  "Long Beach",
];

const QUERIES = ["ADU builder", "general contractor"];

const RESULTS_PER_SEARCH = 10;

interface ScrapedLead {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  source: string;
  sourceUrl: string;
  searchQuery: string;
  website: string;
  rating: number;
  businessStatus: string;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
}

interface GooglePlacesResponse {
  status: string;
  results?: GooglePlace[];
  error_message?: string;
}

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  business_status?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: GooglePlaceDetails;
  error_message?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ScrapeResult {
  leads: ScrapedLead[];
  status: string;
  errorMessage?: string;
}

async function scrapeGoogleMaps(
  city: string,
  state: string,
  query: string
): Promise<ScrapeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not set");

  const textQuery = `${query} ${city} ${state}`;
  const searchUrl =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(textQuery)}&key=${encodeURIComponent(apiKey)}`;

  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as GooglePlacesResponse;

  if (searchData.status !== "OK") {
    console.warn(
      `[scout] Google Maps status: ${searchData.status} for ${city} (${query})`,
      searchData.error_message ?? ""
    );
    return {
      leads: [],
      status: searchData.status,
      errorMessage: searchData.error_message,
    };
  }

  const leads: ScrapedLead[] = [];
  const places = (searchData.results ?? []).slice(0, RESULTS_PER_SEARCH);

  for (const place of places) {
    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(place.place_id)}` +
      `&fields=name,formatted_address,formatted_phone_number,website,rating,business_status` +
      `&key=${encodeURIComponent(apiKey)}`;

    let detail: GooglePlaceDetails = {};
    try {
      const detailsRes = await fetch(detailsUrl);
      const detailsData = (await detailsRes.json()) as GooglePlaceDetailsResponse;
      detail = detailsData.result ?? {};
    } catch (err) {
      console.warn(
        "[scout] Google Maps details failed:",
        err instanceof Error ? err.message : err
      );
    }

    leads.push({
      name: detail.name ?? place.name,
      phone: detail.formatted_phone_number ?? "",
      address: detail.formatted_address ?? place.formatted_address ?? "",
      city,
      state,
      source: "google_maps",
      sourceUrl: `google_maps://place/${place.place_id}`,
      searchQuery: query,
      website: detail.website ?? "",
      rating: detail.rating ?? place.rating ?? 0,
      businessStatus: detail.business_status ?? "",
    });

    await sleep(100);
  }

  return { leads, status: "OK" };
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

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GOOGLE_MAPS_API_KEY required — add it in Railway env vars",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = RunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, targetType, state, city, limit, searchQuery } = parsed.data;
    const queriesToRun = searchQuery ? [searchQuery] : QUERIES;

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

    // ── Google Maps Places scraping ────────────────────────────────────────
    const chosenCities = pickRandom(CITIES, 2);
    const allLeads: ScrapedLead[] = [];
    const citiesScraped: string[] = [];
    let successfulSearches = 0;
    let totalSearches = 0;
    let lastGoogleStatus: string | null = null;
    let lastGoogleErrorMessage: string | null = null;

    for (const gCity of chosenCities) {
      console.log(`[scout] scraping Google Maps for ${gCity}, ${state}`);
      let cityHadResults = false;
      for (const query of queriesToRun) {
        totalSearches++;
        try {
          const result = await scrapeGoogleMaps(gCity, state, query);
          console.log(
            `[scout] ${gCity} / "${query}" → ${result.leads.length} results (status=${result.status})`
          );
          if (result.status !== "OK") {
            lastGoogleStatus = result.status;
            lastGoogleErrorMessage = result.errorMessage ?? null;
          }
          if (result.leads.length > 0) {
            allLeads.push(...result.leads);
            cityHadResults = true;
            successfulSearches++;
          }
        } catch (err) {
          console.warn(
            `[scout] Google Maps failed ${gCity} / "${query}":`,
            err instanceof Error ? err.message : err
          );
          lastGoogleErrorMessage =
            err instanceof Error ? err.message : String(err);
        }
      }
      if (cityHadResults) citiesScraped.push(gCity);
    }

    if (successfulSearches === 0) {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: { status: "failed", completedAt: new Date() },
      });
      const pieces = [
        lastGoogleStatus ? `status=${lastGoogleStatus}` : null,
        lastGoogleErrorMessage,
      ].filter(Boolean);
      const detail =
        pieces.length > 0 ? pieces.join(" — ") : "no results from any city";
      return NextResponse.json(
        {
          success: false,
          error: `Google Maps unavailable: ${detail}`,
          googleStatus: lastGoogleStatus,
          googleErrorMessage: lastGoogleErrorMessage,
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
            source: "google_maps",
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
              website: lead.website,
              rating: lead.rating,
              businessStatus: lead.businessStatus,
              data_source: "google_maps",
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
          "[scout] insert skipped:",
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

    console.log(
      `[scout] done — ${inserted} leads, ${duplicatesSkipped} dupes, cities=${citiesScraped.join(",")}`
    );

    return NextResponse.json({
      success: true,
      jobId: localJob.id,
      status: "done",
      leadsCreated: inserted,
      duplicatesSkipped,
      source: "google_maps",
      citiesScraped,
      searchesMade: totalSearches,
      successfulSearches,
    });
  } catch (err) {
    console.error("[scout] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
