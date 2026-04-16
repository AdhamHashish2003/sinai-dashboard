import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchConnectionData } from "@/lib/refresh-engine";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const connection = await db.connection.findUnique({ where: { id } });
  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await fetchConnectionData(connection);
    // Both paths are HTTP 200 — the endpoint ran without throwing. The
    // `refreshed` flag lets the UI distinguish a real update from a no-op so
    // it can show an informative toast instead of silently doing nothing.
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error(`[connections/fetch] error for ${id}:`, err);
    await db.connection.update({ where: { id }, data: { status: "error" } });
    return NextResponse.json(
      {
        error: "Fetch failed",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
