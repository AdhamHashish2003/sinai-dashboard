"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TrafficSourcesData } from "@/types/dashboard";

const SOURCE_COLORS: Record<string, string> = {
  organic: "#22c55e",
  direct: "#6366f1",
  social: "#f43f5e",
  referral: "#f59e0b",
  paid: "#8b5cf6",
};

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organic Search",
  direct: "Direct",
  social: "Social Media",
  referral: "Referral",
  paid: "Paid Ads",
};

function fetchTrafficSources(period: string): Promise<TrafficSourcesData> {
  return fetch(`/api/dashboard/traffic-sources?period=${period}`).then((r) => r.json());
}

export function TrafficSourcesWidget({ period = "30" }: { period?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["traffic-sources", period], queryFn: () => fetchTrafficSources(period), refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-48 flex gap-4"><div className="flex-1 rounded bg-muted animate-skeleton" /><div className="w-32 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-4 rounded bg-muted animate-skeleton" />)}</div></div>;
  }

  const { sources = [], total = 0 } = data ?? {};

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={sources} dataKey="visitors" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} strokeWidth={0}>
              {sources.map((s) => (
                <Cell key={s.source} fill={SOURCE_COLORS[s.source] ?? "#6366f1"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [v.toLocaleString(), SOURCE_LABELS[name] ?? name]}
              contentStyle={{ background: "hsl(var(--chart-tooltip-bg))", border: "1px solid hsl(var(--chart-tooltip-border))", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col justify-center gap-2 min-w-[130px]">
        {sources.map((s) => (
          <div key={s.source} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[s.source] ?? "#6366f1" }} />
            <span className="text-muted-foreground flex-1 truncate">{SOURCE_LABELS[s.source] ?? s.source}</span>
            <span className="font-semibold">{s.percentage}%</span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 mt-1 text-xs">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
