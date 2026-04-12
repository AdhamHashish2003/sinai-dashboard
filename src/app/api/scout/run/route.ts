import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { runScout } from "@/lib/ghostcrew";
import { z } from "zod";

const RunSchema = z.object({
  productId: z.string().min(1),
  targetType: z.enum(["cslb_adu_builders", "permit_expediters", "small_gcs"]),
  state: z.string().min(2).max(2).default("CA"),
  city: z.string().max(100).nullable().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

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

    // Create local ScoutJob row immediately so the UI can show "queued" state
    const localJob = await db.scoutJob.create({
      data: {
        productId,
        targetType,
        state,
        city: city ?? null,
        limitCount: limit,
        status: "queued",
      },
    });

    // Fire the GhostCrew request
    try {
      const gcRes = await runScout({
        product_slug: product.slug,
        target_type: targetType,
        state,
        city: city ?? null,
        limit,
      });

      await db.scoutJob.update({
        where: { id: localJob.id },
        data: {
          ghostcrewJobId: gcRes.job_id,
          status: gcRes.status === "queued" || gcRes.status === "running" ? "running" : gcRes.status,
        },
      });

      return NextResponse.json({
        jobId: localJob.id,
        ghostcrewJobId: gcRes.job_id,
        status: "running",
      });
    } catch (err) {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        {
          error: "GhostCrew unreachable",
          detail: err instanceof Error ? err.message : "Unknown",
          jobId: localJob.id,
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[scout/run] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
