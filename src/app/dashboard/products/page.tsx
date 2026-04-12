import { db } from "@/lib/db";
import { Package, ExternalLink, Target, MessageSquare } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  idea: "bg-zinc-500/10 text-zinc-400",
  building: "bg-amber-500/10 text-amber-400",
  launched: "bg-emerald-500/10 text-emerald-400",
  retired: "bg-red-500/10 text-red-400",
};

export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your SaaS products. Each product gets its own analytics, content, and growth tracking.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Package size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No products yet. Add your first product to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 transition-shadow duration-200 hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-border bg-primary/10 p-2.5">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">/{product.slug}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[product.status] ?? STATUS_STYLES.idea}`}
                >
                  {product.status}
                </span>
              </div>

              {/* Tagline */}
              {product.tagline && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.tagline}</p>
              )}

              {/* Details grid */}
              <div className="space-y-2 mb-4">
                {product.icp && (
                  <div className="flex items-start gap-2">
                    <Target size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.icp}</p>
                  </div>
                )}
                {product.valueProp && (
                  <div className="flex items-start gap-2">
                    <MessageSquare size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.valueProp}</p>
                  </div>
                )}
              </div>

              {/* Keywords */}
              {product.targetKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {product.targetKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                {product.freeTierHook && (
                  <span className="text-[10px] text-emerald-400">{product.freeTierHook}</span>
                )}
                {product.prodUrl && (
                  <a
                    href={product.prodUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={10} />
                    {product.prodUrl.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
