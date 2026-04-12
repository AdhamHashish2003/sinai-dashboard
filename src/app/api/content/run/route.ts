import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/content/run
 * Manual "Generate Now" trigger. This endpoint does NOT directly call Claude —
 * it flips a flag/creates a placeholder that the next Python worker run will
 * pick up. For an instant manual run, you shell into the worker container or
 * run the worker locally:
 *
 *     cd workers/content && python main.py --product-slug permit-ai
 *
 * For the UI's purposes, we create a placeholder ProofPost with status=draft
 * and empty body so the page optimistically shows "generating…". The next
 * cron tick (or manual worker run) picks it up to fill in.
 *
 * Body: { productId: string, postType?: "city_report" | "fee_comparison" | "adu_case_study" }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = body.productId as string | undefined;
    const postType = (body.postType as string | undefined) ?? "city_report";

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Create a placeholder so the UI shows something immediately.
    // The Python worker will look for status='draft' + empty generatedBody
    // and fill it in on the next run.
    const placeholder = await db.proofPost.create({
      data: {
        productId,
        postType,
        topic: "(generating…)",
        generatedBody: "",
        generatedAssets: [],
        targetPlatforms: [],
        status: "draft",
        errorMessage: "manual_trigger: awaiting worker run",
      },
    });

    return NextResponse.json({
      postId: placeholder.id,
      hint: "Run `python workers/content/main.py --product-slug " +
        product.slug +
        "` or wait for next cron tick.",
    });
  } catch (err) {
    console.error("[content/run] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
