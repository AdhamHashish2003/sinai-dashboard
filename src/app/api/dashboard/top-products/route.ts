import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await db.topProduct.findMany({
    orderBy: { revenueCents: "desc" },
    take: 10,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      name: p.name,
      revenueCents: p.revenueCents,
      unitsSold: p.unitsSold,
    })),
  });
}
