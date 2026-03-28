"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, ShoppingCart, BarChart3 } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { SalesRevenueData } from "@/types/dashboard";

function fetchSales(period: string): Promise<SalesRevenueData> {
  return fetch(`/api/dashboard/sales?period=${period}`).then((r) => r.json());
}

export function SalesRevenueWidget({ period = "30" }: { period?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["sales", period], queryFn: () => fetchSales(period), refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 space-y-3"><div className="h-6 w-32 rounded bg-muted animate-skeleton" /><div className="h-44 rounded bg-muted animate-skeleton" /></div>;
  }

  const { chartData = [], totalRevenueCents = 0, totalOrders = 0, aovCents = 0, revenueChangePct = 0 } = data ?? {};
  const isUp = revenueChangePct >= 0;

  return (
    <div>
      <div className="mb-3 flex items-end gap-4 flex-wrap">
        <div>
          <span className="text-2xl font-bold">{formatCents(totalRevenueCents)}</span>
          <span className={`inline-flex items-center gap-0.5 text-xs ml-1.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(revenueChangePct)}%
          </span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><ShoppingCart size={11} />{totalOrders.toLocaleString()} orders</span>
          <span className="flex items-center gap-1"><BarChart3 size={11} />AOV {formatCents(aovCents)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }} tickFormatter={(v: string) => format(new Date(v), "MMM d")} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--chart-axis-text))" }} tickFormatter={(v: number) => `$${Math.round(v / 100).toLocaleString()}`} tickLine={false} axisLine={false} width={55} />
          <Tooltip
            formatter={(v: number) => [formatCents(v), "Revenue"]}
            labelFormatter={(l: string) => format(new Date(l), "MMM d, yyyy")}
            contentStyle={{ background: "hsl(var(--chart-tooltip-bg))", border: "1px solid hsl(var(--chart-tooltip-border))", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="revenueCents" fill="#6366f1" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
