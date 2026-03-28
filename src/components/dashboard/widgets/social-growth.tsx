"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import type { SocialGrowthData } from "@/types/dashboard";

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1DA1F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  tiktok: "#69C9D0",
  linkedin: "#0A66C2",
};

function fetchSocial(): Promise<SocialGrowthData> {
  return fetch("/api/dashboard/social").then((r) => r.json());
}

export function SocialGrowthWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["social"], queryFn: fetchSocial, refetchInterval: 30_000 });

  if (isLoading) {
    return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  const { accounts = [], chartData = [] } = data ?? {};
  const platforms = Array.from(new Set(chartData.flatMap((d) => Object.keys(d).filter((k) => k !== "date"))));
  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);

  return (
    <div>
      <div className="mb-3 flex items-end gap-3">
        <span className="text-2xl font-bold">{totalFollowers.toLocaleString()}</span>
        <span className="flex items-center gap-0.5 text-sm text-emerald-400 mb-0.5">
          <TrendingUp size={14} />
          total followers
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <div key={a.handle} className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PLATFORM_COLORS[a.platform] ?? "#6366f1" }}
            />
            <span className="text-muted-foreground">{a.handle}</span>
            <span className="font-medium">{(a.followers / 1000).toFixed(1)}k</span>
            <span className="text-emerald-400">+{a.followersChange}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 34% 17%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(215 16% 57%)" }}
            tickFormatter={(v: string) => format(new Date(v), "MMM d")}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 16% 57%)" }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v: number, name: string) => [v.toLocaleString(), name]}
            labelFormatter={(l: string) => format(new Date(l), "MMM d, yyyy")}
            contentStyle={{ background: "hsl(224 71% 6%)", border: "1px solid hsl(216 34% 17%)", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {platforms.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={PLATFORM_COLORS[p] ?? "#6366f1"}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
