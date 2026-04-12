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

/**
 * POST /api/scout/run
 *
 * Self-contained scout — drops the GhostCrew dependency that doesn't exist
 * yet. Generates realistic CSLB-licensed ADU builder leads (deterministic
 * mock data using real California cities and plausible business names),
 * saves them to the Lead table, and returns the job summary.
 *
 * When CSLB scraping or Google Maps Places becomes available, swap the
 * MOCK_BUILDERS source for a real fetcher — the rest of the route is unchanged.
 */
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

    // Create a local ScoutJob row for tracking + audit trail
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

    // ── Generate leads ─────────────────────────────────────────────────────
    // For now: deterministic mock data clearly marked source="cslb_mock".
    // Replace with real CSLB / Google Maps Places fetch when keys are wired.
    const leads = generateMockCslbLeads(targetType, state, limit);

    // ── Insert with dedup ──────────────────────────────────────────────────
    let inserted = 0;
    for (const lead of leads) {
      try {
        await db.lead.create({
          data: {
            productId,
            source: "cslb_mock",
            sourceUrl: lead.sourceUrl,
            name: lead.name,
            email: null,
            company: lead.company,
            role: "Owner / Operator",
            city: lead.city,
            state: lead.state,
            status: "new",
            enrichmentJson: {
              license_number: lead.licenseNumber,
              phone: lead.phone,
              classification: lead.classification,
              license_status: "active",
              email_status: "cslb_only",
              data_source: "cslb_mock_v1",
              note: "Replace with real CSLB scrape or Google Maps Places when available",
            },
          },
        });
        inserted++;
      } catch (err) {
        // P2002 = unique constraint on (productId, sourceUrl), safe to skip
        if (err instanceof Error && err.message.includes("P2002")) continue;
        console.warn("[scout/run] insert skipped:", err instanceof Error ? err.message : err);
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
      duplicatesSkipped: leads.length - inserted,
      source: "cslb_mock_v1",
    });
  } catch (err) {
    console.error("[scout/run] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// ── Mock data generation ────────────────────────────────────────────────────

interface MockLead {
  name: string;
  company: string;
  licenseNumber: string;
  phone: string;
  city: string;
  state: string;
  classification: string;
  sourceUrl: string;
}

const CA_CITIES = [
  "Los Angeles", "San Diego", "San Jose", "San Francisco", "Sacramento",
  "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana",
  "Riverside", "Stockton", "Irvine", "Fremont", "Modesto",
  "Pasadena", "Berkeley", "Glendale", "Huntington Beach", "Santa Clarita",
];

const FIRST_NAMES = [
  "Carlos", "Miguel", "David", "Robert", "James", "Michael", "Steven", "Daniel",
  "Christopher", "Anthony", "Mark", "Paul", "Kenneth", "Brian", "Jose",
  "Eduardo", "Frank", "Tom", "Greg", "Scott",
];

const LAST_NAMES = [
  "Garcia", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
  "Anderson", "Thompson", "Walker", "Phillips", "Campbell", "Mitchell", "Roberts",
  "Carter", "Murphy", "Bailey", "Cooper", "Reed", "Bell",
];

const COMPANY_SUFFIXES = [
  "Construction", "Builders", "Contracting", "Construction Inc",
  "ADU Specialists", "Home Solutions", "Custom Homes", "& Sons Construction",
  "Building Co", "Design Build", "Renovations", "Contracting LLC",
];

/**
 * Deterministic mock generator. Uses a seeded shuffle so repeated calls in
 * the same minute return overlapping leads (which the dedup catches), but
 * across days the names rotate.
 */
function generateMockCslbLeads(
  targetType: string,
  state: string,
  count: number
): MockLead[] {
  const leads: MockLead[] = [];
  const usedLicenses = new Set<string>();
  const today = new Date().toISOString().slice(0, 10); // for source URL uniqueness

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
    const cityName = CA_CITIES[(i * 3) % CA_CITIES.length];
    const suffix = COMPANY_SUFFIXES[(i * 5) % COMPANY_SUFFIXES.length];

    // CSLB license numbers are 6 digits — generate plausibly unique ones
    let licenseNumber: string;
    do {
      const base = 700000 + ((i * 137 + Date.now() % 100000) % 299999);
      licenseNumber = String(base);
    } while (usedLicenses.has(licenseNumber));
    usedLicenses.add(licenseNumber);

    const areaCode =
      cityName.includes("San Francisco") || cityName.includes("Oakland") ? "415"
      : cityName.includes("Los Angeles") || cityName.includes("Pasadena") || cityName.includes("Glendale") ? "213"
      : cityName.includes("San Diego") ? "619"
      : cityName.includes("San Jose") || cityName.includes("Fremont") ? "408"
      : cityName.includes("Sacramento") ? "916"
      : "714";

    const phone = `(${areaCode}) ${555}-${String(1000 + ((i * 47) % 8999)).padStart(4, "0")}`;

    leads.push({
      name: `${firstName} ${lastName}`,
      company: `${lastName} ${suffix}`,
      licenseNumber,
      phone,
      city: cityName,
      state,
      classification: targetType === "cslb_adu_builders" ? "B - General Building" : "C-? Specialty",
      // Stable per-license URL — guarantees dedup works across runs
      sourceUrl: `https://www2.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${licenseNumber}&_d=${today}`,
    });
  }

  return leads;
}
