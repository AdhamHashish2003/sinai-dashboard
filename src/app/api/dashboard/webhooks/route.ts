import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await db.webhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 20,
    select: { id: true, source: true, event: true, receivedAt: true },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      source: e.source,
      event: e.event,
      receivedAt: e.receivedAt.toISOString(),
    })),
  });
}
