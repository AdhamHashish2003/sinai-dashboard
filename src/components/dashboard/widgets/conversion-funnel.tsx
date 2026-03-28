"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import type { ConversionFunnelData } from "@/types/dashboard";

const STAGE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#22c55e"];

function fetchFunnel(period: string): Promise<ConversionFunnelData> {
  return fetch(`/api/dashboard/conversion-funnel?period=${period}`).then((r) => r.json());
}

export function ConversionFunnelWidget({ period = "30" }: { period?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["conversion-funnel", period], queryFn: () => fetchFunnel(period), refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3"><div className="h-5 w-40 rounded bg-muted animate-skeleton" />{[1,2,3,4].map(i=><div key={i} className="space-y-1"><div className="h-3 w-24 rounded bg-muted animate-skeleton" /><div className="h-6 rounded bg-muted animate-skeleton" /></div>)}</div>;
  }

  const { stages = [], overallRate = 0 } = data ?? {};
  const maxCount = stages[0]?.count ?? 1;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Overall conversion:</span>
        <span className="text-lg font-bold text-emerald-400">{overallRate}%</span>
      </div>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 4);
          return (
            <div key={stage.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stage.count.toLocaleString()}</span>
                  <span className="text-muted-foreground w-12 text-right">{stage.percentage}%</span>
                </div>
              </div>
              <div className="h-6 w-full rounded-md bg-muted/50 overflow-hidden">
                <div className="h-full rounded-md transition-all duration-500" style={{ width: `${widthPct}%`, background: STAGE_COLORS[i % STAGE_COLORS.length], opacity: 0.85 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
