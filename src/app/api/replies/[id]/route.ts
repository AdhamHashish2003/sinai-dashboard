import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  action: z.enum(["post", "reject", "regenerate"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const reply = await db.reply.findUnique({ where: { id } });
    if (!reply) {
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

    const { action, note } = parsed.data;

    if (action === "post") {
      await db.$transaction([
        db.reply.update({
          where: { id },
          data: { status: "posted", postedAt: new Date() },
        }),
        db.signal.update({
          where: { id: reply.signalId },
          data: { status: "posted" },
        }),
      ]);
    } else if (action === "reject") {
      await db.reply.update({
        where: { id },
        data: { status: "rejected" },
      });
    } else if (action === "regenerate") {
      // Queue for re-drafting: worker will pick up on next cron run
      await db.reply.update({
        where: { id },
        data: {
          status: "pending_draft",
          notes: note ? `regenerate: ${note}` : "regenerate: different angle",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[replies] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
