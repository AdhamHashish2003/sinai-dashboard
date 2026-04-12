import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["new", "approved", "dismissed", "ready_to_draft", "posted"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const signal = await db.signal.findUnique({ where: { id } });
    if (!signal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    await db.signal.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    // When marking ready_to_draft, create a Reply row so /swarm shows it
    // in the "Pending Draft" column and the swarm worker picks it up.
    if (parsed.data.status === "ready_to_draft") {
      const existing = await db.reply.findUnique({ where: { signalId: id } });
      if (!existing) {
        await db.reply.create({
          data: {
            signalId: id,
            productId: signal.productId,
            platform: signal.source,
            status: "pending_draft",
            draftBody: "",
            draftVersions: [],
          },
        });
      } else if (existing.status === "rejected") {
        // Un-reject + re-queue for drafting
        await db.reply.update({
          where: { id: existing.id },
          data: { status: "pending_draft" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[signals] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
