"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { formatCents, downloadCsv } from "@/lib/utils";
import type { TopProductData } from "@/types/dashboard";

function fetchTopProducts(): Promise<{ products: TopProductData[] }> {
  return fetch("/api/dashboard/top-products").then((r) => r.json());
}

export function TopProductsWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["top-products"], queryFn: fetchTopProducts, refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="space-y-1"><div className="h-3 rounded bg-muted animate-skeleton" /><div className="h-1.5 rounded bg-muted animate-skeleton" /></div>)}</div>;
  }

  const products = data?.products ?? [];
  const maxRevenue = products[0]?.revenueCents ?? 1;

  function handleExport() {
    downloadCsv(
      "top-products.csv",
      ["Product", "Revenue", "Units Sold"],
      products.map((p) => [p.name, formatCents(p.revenueCents), String(p.unitsSold)])
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={handleExport} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Download size={10} />CSV
        </button>
      </div>
      <div className="space-y-2.5">
        {products.map((p, i) => {
          const barPct = Math.max((p.revenueCents / maxRevenue) * 100, 3);
          return (
            <div key={p.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-muted-foreground truncate flex-1">
                  <span className="text-xs font-medium text-foreground/60 w-4">{i + 1}.</span>{p.name}
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="font-semibold">{formatCents(p.revenueCents)}</span>
                  <span className="text-muted-foreground w-14 text-right">{p.unitsSold} sold</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${barPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
