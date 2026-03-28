"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ActiveUsersData } from "@/types/dashboard";

function fetchUsers(): Promise<{ products: ActiveUsersData[] }> {
  return fetch("/api/dashboard/users").then((r) => r.json());
}

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7"];

export function ActiveUsersWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers, refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  const products = data?.products ?? [];
  const totalUsers = products.reduce((s, p) => s + p.activeUsers, 0);

  return (
    <div>
      <div className="mb-3">
        <span className="text-2xl font-bold">{totalUsers.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground ml-2">active users</span>
      </div>

      <div className="mb-3 space-y-2">
        {products.map((p) => {
          const isUp = p.trend >= 0;
          return (
            <div key={p.productName} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">{p.productName}</span>
              <span className="font-semibold mx-2">{p.activeUsers.toLocaleString()}</span>
              <span className={`flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(p.trend).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={products} barCategoryGap="30%">
          <XAxis
            dataKey="productName"
            tick={{ fontSize: 10, fill: "hsl(215 16% 57%)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(v: number) => [v.toLocaleString(), "Users"]}
            contentStyle={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="activeUsers" radius={[4, 4, 0, 0]}>
            {products.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
