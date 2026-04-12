import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).max(200),
  source: z.enum(["scout", "radar", "manual", "inbound"]).default("manual"),
  sourceUrl: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const product = await db.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    try {
      const lead = await db.lead.create({
        data: {
          productId: data.productId,
          source: data.source,
          sourceUrl: data.sourceUrl ?? null,
          name: data.name,
          email: data.email ?? null,
          company: data.company ?? null,
          role: data.role ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          notes: data.notes ?? null,
          status: "new",
          enrichmentJson: {},
        },
      });
      return NextResponse.json({ lead }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("P2002")) {
        return NextResponse.json(
          { error: "Duplicate lead (same source URL for this product)" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("[leads] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
