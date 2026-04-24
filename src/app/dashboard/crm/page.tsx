import { db } from "@/lib/db";
import { CrmClient } from "@/components/crm/crm-client";

const DENTAL_PRODUCT_SLUG = "dental-clinics";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  try {
    const dentalProduct = await db.product.upsert({
      where: { slug: DENTAL_PRODUCT_SLUG },
      update: {
        name: "Dental Clinics",
        status: "active",
        scoutState: "California",
        scoutQueries: ["dental clinic", "dentist"],
      },
      create: {
        slug: DENTAL_PRODUCT_SLUG,
        name: "Dental Clinics",
        tagline: "California dental clinic lead database",
        status: "active",
        icp: "Dental clinics in California",
        valueProp: "Find dental practices with website, email, social links, and social quality signals",
        targetKeywords: ["dental clinic", "dentist"],
        targetSubreddits: [],
        scoutState: "California",
        scoutCities: [],
        scoutQueries: ["dental clinic", "dentist"],
      },
      select: { id: true, name: true, slug: true },
    });

    const leads = await db.lead.findMany({
      where: { productId: dentalProduct.id },
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    return (
      <CrmClient
        product={dentalProduct}
        leads={leads.map((l) => ({
          id: l.id,
          productId: l.productId,
          productName: l.product.name,
          productSlug: l.product.slug,
          source: l.source,
          sourceUrl: l.sourceUrl ?? "",
          name: l.name,
          email: l.email ?? "",
          company: l.company ?? "",
          role: l.role ?? "",
          city: l.city ?? "",
          state: l.state ?? "",
          enrichmentJson: (l.enrichmentJson as Record<string, unknown>) ?? {},
          status: l.status,
          lastTouchAt: l.lastTouchAt?.toISOString() ?? "",
          replyReceived: l.replyReceived,
          notes: l.notes ?? "",
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    );
  } catch (err) {
    console.error("[crm] database unavailable:", err);
    return (
      <CrmClient
        product={{ id: DENTAL_PRODUCT_SLUG, name: "Dental Clinics", slug: DENTAL_PRODUCT_SLUG }}
        leads={[]}
      />
    );
  }
}
