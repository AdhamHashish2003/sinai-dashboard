import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

/**
 * POST /api/admin/refresh-demo-data
 *
 * Shifts `SaasMetric.recordedAt` and `SocialMetric.recordedAt` so the newest
 * record lands on today. Demo data from `prisma/seed.ts` freezes in time —
 * this keeps the MRR/social charts looking alive until real webhook ingest
 * replaces the seed.
 *
 * Auth: accepts either an authed session OR `x-admin-secret` header matching
 * `ADMIN_SECRET` env var. The secret path lets GitHub Actions / Railway cron
 * call this endpoint without maintaining a session cookie.
 *
 * Idempotent. If the newest record is already today, nothing changes.
 */

async function authorize(req: Request): Promise<
  { ok: true } | { ok: false; status: number; body: { error: string } }
> {
  // Secret-header path for cron jobs
  const providedSecret = req.headers.get("x-admin-secret");
  const expectedSecret = process.env.ADMIN_SECRET;
  if (providedSecret && expectedSecret && providedSecret === expectedSecret) {
    return { ok: true };
  }
  if (providedSecret && !expectedSecret) {
    return {
      ok: false,
      status: 503,
      body: { error: "ADMIN_SECRET not configured on server" },
    };
  }
  if (providedSecret && providedSecret !== expectedSecret) {
    return { ok: false, status: 403, body: { error: "Invalid admin secret" } };
  }

  // Session path for browser callers
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, status: 401, body: { error: "Unauthorized" } };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const auth = await authorize(req);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Shift SaaS metrics so the latest recordedAt aligns to today.
  const latestSaasMetric = await db.saasMetric.findFirst({
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });

  let shiftedSaas = 0;
  if (latestSaasMetric) {
    const shiftMs = startOfToday.getTime() - latestSaasMetric.recordedAt.getTime();
    if (shiftMs > 0) {
      const rows = await db.saasMetric.findMany({ select: { id: true, recordedAt: true } });
      await Promise.all(
        rows.map((r) =>
          db.saasMetric.update({
            where: { id: r.id },
            data: { recordedAt: new Date(r.recordedAt.getTime() + shiftMs) },
          })
        )
      );
      shiftedSaas = rows.length;
    }
  }

  // Shift SocialMetric timestamps the same way.
  const latestSocial = await db.socialMetric.findFirst({
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  let shiftedSocial = 0;
  if (latestSocial) {
    const shiftMs = startOfToday.getTime() - latestSocial.recordedAt.getTime();
    if (shiftMs > 0) {
      const rows = await db.socialMetric.findMany({ select: { id: true, recordedAt: true } });
      await Promise.all(
        rows.map((r) =>
          db.socialMetric.update({
            where: { id: r.id },
            data: { recordedAt: new Date(r.recordedAt.getTime() + shiftMs) },
          })
        )
      );
      shiftedSocial = rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    shiftedSaasMetrics: shiftedSaas,
    shiftedSocialMetrics: shiftedSocial,
    alignedTo: startOfToday.toISOString(),
  });
}
