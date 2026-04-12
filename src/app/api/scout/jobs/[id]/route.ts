import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScoutJob, type ScoutResultLead } from "@/lib/ghostcrew";

/**
 * GET /api/scout/jobs/:id
 * Poll for GhostCrew scout job status. When GhostCrew reports "done",
 * bulk-insert the results as Lead rows, dedup'd by (productId, sourceUrl).
 * Client polls this endpoint every 5s until status === "done" or "failed".
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const localJob = await db.scoutJob.findUnique({ where: { id: params.id } });
    if (!localJob) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Terminal states → return cached
    if (localJob.status === "done" || localJob.status === "failed") {
      return NextResponse.json({
        jobId: localJob.id,
        status: localJob.status,
        resultsCount: localJob.resultsCount,
        error: localJob.error,
      });
    }

    if (!localJob.ghostcrewJobId) {
      return NextResponse.json({
        jobId: localJob.id,
        status: localJob.status,
        resultsCount: 0,
        error: "no ghostcrew job id",
      });
    }

    // Poll GhostCrew
    let gcStatus;
    try {
      gcStatus = await getScoutJob(localJob.ghostcrewJobId);
    } catch (err) {
      return NextResponse.json({
        jobId: localJob.id,
        status: "running",
        resultsCount: 0,
        error: err instanceof Error ? err.message : "poll failed",
      });
    }

    if (gcStatus.status === "queued" || gcStatus.status === "running") {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: { status: "running" },
      });
      return NextResponse.json({
        jobId: localJob.id,
        status: "running",
        resultsCount: 0,
        error: null,
      });
    }

    if (gcStatus.status === "failed") {
      await db.scoutJob.update({
        where: { id: localJob.id },
        data: {
          status: "failed",
          error: gcStatus.error ?? "unknown failure",
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        jobId: localJob.id,
        status: "failed",
        resultsCount: 0,
        error: gcStatus.error,
      });
    }

    // status === "done" — bulk insert leads
    const inserted = await insertScoutLeads(localJob.productId, gcStatus.results);

    await db.scoutJob.update({
      where: { id: localJob.id },
      data: {
        status: "done",
        resultsCount: inserted,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: localJob.id,
      status: "done",
      resultsCount: inserted,
      error: null,
    });
  } catch (err) {
    console.error("[scout/jobs] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

async function insertScoutLeads(
  productId: string,
  results: ScoutResultLead[]
): Promise<number> {
  let inserted = 0;
  for (const r of results) {
    if (!r.name || !r.source_url) continue;
    try {
      await db.lead.create({
        data: {
          productId,
          source: "scout",
          sourceUrl: r.source_url,
          name: r.name,
          email: r.email ?? null,
          company: r.company ?? null,
          role: r.role ?? null,
          city: r.city ?? null,
          state: r.state ?? null,
          status: "new",
          enrichmentJson: {
            scout_source: r.source,
            license_number: r.license_number,
            phone: r.phone,
            mailing_address: r.mailing_address,
            classification: r.classification,
            issue_date: r.issue_date,
            expiration_date: r.expiration_date,
            license_status: r.status,
            email_status: r.email ? "scout" : "cslb_only",
          },
        },
      });
      inserted++;
    } catch (err) {
      // P2002 = unique constraint → dedup hit, skip silently
      if (err instanceof Error && err.message.includes("P2002")) continue;
      console.warn("[scout/jobs] insert skipped:", err instanceof Error ? err.message : err);
    }
  }
  return inserted;
}
