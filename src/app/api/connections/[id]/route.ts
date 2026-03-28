import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
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

  await db.connection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
