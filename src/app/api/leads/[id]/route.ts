import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z
    .enum(["new", "enriched", "contacted", "replied", "trial", "paid", "dead"])
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
  replyReceived: z.boolean().optional(),
  touch: z.boolean().optional(), // if true, sets lastTouchAt = now
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, notes, replyReceived, touch } = parsed.data;

    const data: {
      status?: string;
      notes?: string | null;
      replyReceived?: boolean;
      lastTouchAt?: Date;
    } = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (replyReceived !== undefined) data.replyReceived = replyReceived;
    if (touch) data.lastTouchAt = new Date();

    // Auto-touch when moving to contacted
    if (status === "contacted" && !touch) {
      data.lastTouchAt = new Date();
    }

    await db.lead.update({ where: { id }, data });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[leads/id] PATCH error:", err);
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

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[leads/id] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
