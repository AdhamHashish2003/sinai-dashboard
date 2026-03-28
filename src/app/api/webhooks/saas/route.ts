import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitDashboardUpdate } from "@/lib/socket-server";
import { z } from "zod";

const payloadSchema = z.object({
  source: z.string().min(1).max(100),
  event: z.string().min(1).max(100),
  data: z.record(z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });
  }

  const { source, event, data } = parsed.data;

  const product = await db.saasProduct.findUnique({ where: { slug: source } });

  const webhookEvent = await db.webhookEvent.create({
    data: {
      source,
      event,
      payload: data as Record<string, string | number | boolean | null>,
      productId: product?.id ?? null,
    },
  });

  emitDashboardUpdate("webhook", { id: webhookEvent.id, source, event });

  return NextResponse.json({ received: true, id: webhookEvent.id });
}
