import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateMetricsSchema = z.object({
  followers: z.number().int().min(0),
  engagementRate: z.number().min(0).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const connection = await db.connection.findUnique({ where: { id } });
    if (!connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateMetricsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { followers, engagementRate } = parsed.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db.connectionMetric.findFirst({
      where: { connectionId: id, date: { gte: today } },
      orderBy: { date: "desc" },
    });

    if (existing) {
      await db.connectionMetric.update({
        where: { id: existing.id },
        data: { followers, engagementRate },
      });
    } else {
      await db.connectionMetric.create({
        data: {
          connectionId: id,
          date: new Date(),
          followers,
          engagementRate,
        },
      });
    }

    await db.connection.update({
      where: { id },
      data: { dataSource: "manual", lastFetchedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connections] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const connection = await db.connection.findUnique({ where: { id } });
    if (!connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.connection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connections] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
