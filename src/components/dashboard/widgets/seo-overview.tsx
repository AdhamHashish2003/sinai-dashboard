"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, FileText, TrendingUp, TrendingDown } from "lucide-react";
import type { SeoOverviewData } from "@/types/dashboard";

function fetchSeo(period: string): Promise<SeoOverviewData> {
  return fetch(`/api/dashboard/seo-overview?period=${period}`).then((r) => r.json());
}

export function SeoOverviewWidget({ period = "30" }: { period?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["seo-overview", period], queryFn: () => fetchSeo(period), refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3"><div className="grid grid-cols-2 gap-3"><div className="h-20 rounded bg-muted animate-skeleton" /><div className="h-20 rounded bg-muted animate-skeleton" /></div><div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-4 rounded bg-muted animate-skeleton" />)}</div></div>;
  }

  const { domainAuthority = 0, daChangePct = 0, indexedPages = 0, indexedChangePct = 0, topLandingPages = [] } = data ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Globe size={12} />Domain Authority</div>
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-bold">{domainAuthority}</span>
            <span className={`flex items-center gap-0.5 text-xs mb-0.5 ${daChangePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {daChangePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{Math.abs(daChangePct)}%
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><FileText size={12} />Indexed Pages</div>
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-bold">{indexedPages.toLocaleString()}</span>
            <span className={`flex items-center gap-0.5 text-xs mb-0.5 ${indexedChangePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {indexedChangePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{Math.abs(indexedChangePct)}%
            </span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Top Landing Pages</h4>
        <div className="space-y-1.5">
          {topLandingPages.map((lp) => (
            <div key={lp.page} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1 mr-2">{lp.page}</span>
              <span className="font-semibold shrink-0">{lp.views.toLocaleString()} views</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
