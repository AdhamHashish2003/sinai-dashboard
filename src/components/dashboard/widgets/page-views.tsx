"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PageViewsData } from "@/types/dashboard";

function fetchPageViews(period: string): Promise<PageViewsData> {
  return fetch(`/api/dashboard/page-views?period=${period}`).then((r) => r.json());
}

export function PageViewsWidget({ period = "30" }: { period?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["page-views", period], queryFn: () => fetchPageViews(period), refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3"><div className="h-6 w-32 rounded bg-muted animate-skeleton" /><div className="h-44 rounded bg-muted animate-skeleton" /></div>;
  }

  const { chartData = [], totalViews = 0, totalUnique = 0, viewsChangePct = 0 } = data ?? {};
  const isUp = viewsChangePct >= 0;

  return (
    <div>
      <div className="mb-3 flex items-end gap-4">
        <div>
          <span className="text-2xl font-bold">{totalViews.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground ml-1.5">views</span>
        </div>
        <div>
          <span className="text-lg font-semibold text-muted-foreground">{totalUnique.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground ml-1.5">unique</span>
        </div>
        <span className={`flex items-center gap-0.5 text-sm mb-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(viewsChangePct).toFixed(1)}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="pv-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pv-unique" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }} tickFormatter={(v: string) => format(new Date(v), "MMM d")} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} tickLine={false} axisLine={false} width={45} />
          <Tooltip
            formatter={(v: number, name: string) => [v.toLocaleString(), name === "totalViews" ? "Page Views" : "Unique Visitors"]}
            labelFormatter={(l: string) => format(new Date(l), "MMM d, yyyy")}
            contentStyle={{ background: "hsl(var(--chart-tooltip-bg))", border: "1px solid hsl(var(--chart-tooltip-border))", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === "totalViews" ? "Page Views" : "Unique Visitors")} />
          <Area type="monotone" dataKey="totalViews" stroke="#6366f1" fill="url(#pv-views)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="uniqueVisitors" stroke="#22d3ee" fill="url(#pv-unique)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
