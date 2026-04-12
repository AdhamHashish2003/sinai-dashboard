import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).nullable().optional(),
  status: z
    .enum(["idea", "building", "launched", "active", "retired"])
    .optional(),
  icp: z.string().max(2000).nullable().optional(),
  targetKeywords: z.array(z.string()).optional(),
  targetSubreddits: z.array(z.string()).optional(),
  valueProp: z.string().max(2000).nullable().optional(),
  freeTierHook: z.string().max(500).nullable().optional(),
  prodUrl: z.string().url().nullable().optional().or(z.literal("")),
  groqKey: z.string().max(500).nullable().optional().or(z.literal("")),
  telegramChatId: z.string().max(100).nullable().optional().or(z.literal("")),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
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

    const data = parsed.data;

    // Convert empty strings to null so we don't pollute the DB with ""
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === "") {
        cleaned[k] = null;
      } else if (v !== undefined) {
        cleaned[k] = v;
      }
    }

    await db.product.update({
      where: { id },
      data: cleaned,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[products/id] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
