import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { commitRequestSchema } from "@/types/launch";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = commitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid launch form", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { core, radar, scout, content, seed, model } = parsed.data;

  try {
    const product = await db.product.create({
      data: {
        slug: core.slug,
        name: core.name,
        tagline: core.tagline,
        status: "active",
        icp: core.icp,
        valueProp: core.valueProp,
        freeTierHook: core.freeTierHook,
        targetSubreddits: radar.targetSubreddits,
        targetKeywords: radar.targetKeywords,
        scoutState: scout.scoutState,
        scoutCities: scout.scoutCities,
        scoutQueries: scout.scoutQueries,
        contentPostTypes: content.contentPostTypes,
        contentTopics: content.contentTopics,
        launchedAt: new Date(),
        launchSeed: seed,
        launchModel: model,
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const suggestions = [2, 3, 4].map((n) => `${core.slug}-${n}`);
      return NextResponse.json(
        {
          error: "Slug already exists",
          field: "core.slug",
          suggestions,
        },
        { status: 409 }
      );
    }

    console.error("[launches] commit error:", err);
    return NextResponse.json(
      { error: "Commit failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
