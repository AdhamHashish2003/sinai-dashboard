import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeState, runDentalScout } from "@/lib/dental-scout";
import { normalizeCaliforniaCity } from "@/lib/california-cities";
import { z } from "zod";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const DENTAL_PRODUCT_SLUG = "dental-clinics";

const RunSchema = z.object({
  productId: z.string().min(1).optional(),
  state: z.string().trim().min(1).max(80).default("California"),
  city: z.string().trim().min(1).max(120),
  limit: z.number().int().min(1).max(30).default(10),
});

async function ensureDentalProduct(productId?: string) {
  if (productId) {
    const existing = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, name: true },
    });
    if (existing) return existing;
  }

  return db.product.upsert({
    where: { slug: DENTAL_PRODUCT_SLUG },
    update: {
      name: "Dental Clinics",
      status: "active",
      scoutState: "California",
      scoutQueries: ["dental clinic", "dentist"],
    },
    create: {
      slug: DENTAL_PRODUCT_SLUG,
      name: "Dental Clinics",
      tagline: "California dental clinic lead database",
      status: "active",
      icp: "Dental clinics in California",
      valueProp: "Find dental practices with website, email, social links, and social quality signals",
      targetKeywords: ["dental clinic", "dentist"],
      targetSubreddits: [],
      scoutState: "California",
      scoutCities: [],
      scoutQueries: ["dental clinic", "dentist"],
    },
    select: { id: true, slug: true, name: true },
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GOOGLE_MAPS_API_KEY required. Add a Places-enabled key to your env vars.",
        },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = RunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, limit } = parsed.data;
    const state = normalizeState(parsed.data.state);
    if (state !== "California") {
      return NextResponse.json(
        { error: "Only California is supported right now" },
        { status: 400 }
      );
    }

    const city = normalizeCaliforniaCity(parsed.data.city);
    if (!city) {
      return NextResponse.json(
        {
          error: "Invalid city. Choose a city from the California city list.",
        },
        { status: 400 }
      );
    }
    const product = await ensureDentalProduct(productId);

    const localJob = await db.scoutJob.create({
      data: {
        productId: product.id,
        targetType: "dental_clinics",
        state,
        city,
        limitCount: limit,
        status: "running",
      },
    });

    const result = await runDentalScout({ city, state, limit });

    if (result.leads.length === 0) {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: {
          status: "failed",
          error: result.googleErrorMessage ?? result.googleStatus,
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: "No dental clinics returned from Google Places",
          googleStatus: result.googleStatus,
          googleErrorMessage: result.googleErrorMessage,
          searchQueries: result.searchQueries,
        },
        { status: result.googleStatus === "ZERO_RESULTS" ? 404 : 503 }
      );
    }

    let inserted = 0;
    let duplicatesSkipped = 0;
    const scrapedAt = new Date().toISOString();

    for (const lead of result.leads) {
      try {
        await db.lead.create({
          data: {
            productId: product.id,
            source: "google_maps",
            sourceUrl: lead.googleMapsUrl,
            name: lead.name,
            email: lead.emails[0] ?? null,
            company: lead.name,
            role: "Dental clinic",
            city: lead.city,
            state: lead.state,
            status: "enriched",
            enrichmentJson: {
              industry: "dental",
              placeId: lead.placeId,
              address: lead.address,
              phone: lead.phone,
              website: lead.website,
              googleMapsUrl: lead.googleMapsUrl,
              rating: lead.rating,
              businessStatus: lead.businessStatus,
              emails: lead.emails,
              instagram: lead.instagram,
              tiktok: lead.tiktok,
              socialLinks: [...lead.instagram, ...lead.tiktok],
              hasSocialMedia: lead.hasSocialMedia,
              missingSocialMedia: !lead.hasSocialMedia,
              goodSocialMedia: lead.goodSocialMedia,
              maxVideoViews: lead.maxVideoViews,
              socialScanStatus: lead.socialScanStatus,
              foundingDate: lead.foundingDate,
              foundingYear: lead.foundingYear,
              foundingEvidence: lead.foundingEvidence,
              isFranchise: lead.isFranchise,
              franchiseReason: lead.franchiseReason,
              searchQuery: lead.searchQuery,
              scrapedAt,
              source: "google_places_live",
            },
          },
        });
        inserted++;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          duplicatesSkipped++;
          continue;
        }
        throw err;
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
      product,
      city,
      state,
      searchQueries: result.searchQueries,
    });
  } catch (err) {
    console.error("[dental-scout] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
