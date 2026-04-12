import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  action: z.enum(["approve", "reject", "regenerate", "mark_posted", "set_engagement"]),
  postedPlatforms: z.array(z.string()).optional(),
  postedEngagement: z.number().int().min(0).optional(),
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
    const post = await db.proofPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, postedPlatforms, postedEngagement, note } = parsed.data;

    if (action === "approve") {
      await db.proofPost.update({
        where: { id },
        data: { status: "approved" },
      });
    } else if (action === "reject") {
      await db.proofPost.update({
        where: { id },
        data: { status: "rejected" },
      });
    } else if (action === "mark_posted") {
      await db.proofPost.update({
        where: { id },
        data: {
          status: "posted",
          postedAt: new Date(),
          postedPlatforms: postedPlatforms ?? [],
        },
      });
    } else if (action === "set_engagement") {
      await db.proofPost.update({
        where: { id },
        data: { postedEngagement: postedEngagement ?? null },
      });
    } else if (action === "regenerate") {
      // Queue for re-drafting: flip status back to draft and let a manual
      // content/run call or next cron re-generate. Existing body moves into
      // draftVersions history.
      const currentVersions = Array.isArray(post.draftVersions)
        ? (post.draftVersions as Array<{ body: string }>)
        : [];
      const withCurrent = [...currentVersions, { body: post.generatedBody, note: "pre-regenerate" }];
      await db.proofPost.update({
        where: { id },
        data: {
          status: "draft",
          draftVersions: withCurrent,
          errorMessage: note ? `regenerate: ${note}` : "regenerate: different angle",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[content/id] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
