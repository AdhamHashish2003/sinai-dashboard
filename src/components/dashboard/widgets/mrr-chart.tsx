"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { MrrChartData } from "@/types/dashboard";

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7"];

function fetchMrr(): Promise<MrrChartData> {
  return fetch("/api/dashboard/mrr").then((r) => r.json());
}

export function MrrChartWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["mrr"], queryFn: fetchMrr, refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3"><div className="h-6 w-32 rounded bg-muted animate-skeleton" /><div className="h-44 rounded bg-muted animate-skeleton" /></div>;
  }

  const { products = [], chartData = [], totalMrrCents = 0, mrrChangePct = 0 } = data ?? {};
  const isUp = mrrChangePct >= 0;

  return (
    <div>
      <div className="mb-3 flex items-end gap-3">
        <span className="text-2xl font-bold">{formatCents(totalMrrCents)}</span>
        <span className={`flex items-center gap-0.5 text-sm mb-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(mrrChangePct).toFixed(1)}% vs last week
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            {products.map((p, i) => (
              <linearGradient key={p} id={`mrr-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }}
            tickFormatter={(v: string) => format(new Date(v), "MMM d")}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }}
            tickFormatter={(v: number) => `$${Math.round(v / 100).toLocaleString()}`}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatCents(v), name]}
            labelFormatter={(l: string) => format(new Date(l), "MMM d, yyyy")}
            contentStyle={{ background: "hsl(var(--chart-tooltip-bg))", border: "1px solid hsl(var(--chart-tooltip-border))", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {products.map((p, i) => (
            <Area
              key={p}
              type="monotone"
              dataKey={p}
              stroke={COLORS[i % COLORS.length]}
              fill={`url(#mrr-grad-${i})`}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
