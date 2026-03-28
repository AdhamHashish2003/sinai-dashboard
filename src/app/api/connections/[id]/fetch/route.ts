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
    await fetchConnectionData(connection);
    return NextResponse.json({ success: true });
  } catch {
    await db.connection.update({ where: { id }, data: { status: "error" } });
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
