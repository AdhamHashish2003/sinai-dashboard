import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health
 * Unauthenticated liveness probe for Railway + external monitors.
 * Verifies the Node process is up AND the DB is reachable.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "launchforge",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "launchforge",
        error: err instanceof Error ? err.message : "db_unreachable",
      },
      { status: 503 }
    );
  }
}
