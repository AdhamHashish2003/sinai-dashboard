import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/scout/jobs/:id
 * Returns the local ScoutJob status. With the rewritten /api/scout/run that
 * generates leads synchronously and marks status='done' immediately, this is
 * essentially a cached read — the polling loop in the CRM client hits this
 * once and gets the final state.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await db.scoutJob.findUnique({ where: { id: params.id } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      resultsCount: job.resultsCount,
      error: job.error,
    });
  } catch (err) {
    console.error("[scout/jobs] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
