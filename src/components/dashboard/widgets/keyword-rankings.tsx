"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KeywordRankData } from "@/types/dashboard";

function fetchKeywords(): Promise<{ rankings: KeywordRankData[] }> {
  return fetch("/api/dashboard/keywords").then((r) => r.json());
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-xs">+{change} <TrendingUp size={11} /></span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs">{change} <TrendingDown size={11} /></span>;
  return <span className="text-muted-foreground"><Minus size={11} /></span>;
}

export function KeywordRankingsWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["keywords"], queryFn: fetchKeywords, refetchInterval: 60_000 });

  if (isLoading) {
    return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  const rankings = data?.rankings ?? [];

  if (rankings.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No keyword data yet.</p>;
  }

  return (
    <div className="space-y-1 max-h-56 overflow-y-auto">
      {rankings.map((r) => (
        <div key={r.keyword} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{r.keyword}</p>
          </div>
          <div className="flex items-center gap-3 ml-2 flex-shrink-0">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                r.position <= 3 ? "bg-emerald-400/10 text-emerald-400" :
                r.position <= 10 ? "bg-yellow-400/10 text-yellow-400" :
                "bg-muted text-muted-foreground"
              }`}
            >
              #{r.position}
            </span>
            <ChangeIndicator change={r.change} />
          </div>
        </div>
      ))}
    </div>
  );
}
