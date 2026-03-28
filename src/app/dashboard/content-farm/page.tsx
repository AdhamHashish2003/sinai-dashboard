"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { TrendingUp, TrendingDown, Heart, Instagram, Search } from "lucide-react";
import type { ContentFarmAccount } from "@/types/dashboard";

const PLATFORM_CONFIG: Record<string, { label: string; color: string; accent: string; border: string }> = {
  instagram: { label: "Instagram", color: "#E1306C", accent: "from-pink-500/10 via-purple-500/10 to-orange-500/10", border: "border-t-pink-500/40" },
  tiktok: { label: "TikTok", color: "#69C9D0", accent: "from-zinc-900/80 via-zinc-800/60 to-zinc-900/80", border: "border-t-cyan-400/40" },
};

function fetchContentFarm(): Promise<{ accounts: ContentFarmAccount[] }> {
  return fetch("/api/dashboard/content-farm").then((r) => r.json());
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.8a8.24 8.24 0 0 0 4.76 1.52V6.87a4.84 4.84 0 0 1-1-.18Z" />
    </svg>
  );
}

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  if (platform === "tiktok") return <TikTokIcon size={size} />;
  return <Instagram size={size} />;
}

function AccountCard({ account }: { account: ContentFarmAccount }) {
  const config = PLATFORM_CONFIG[account.platform] ?? { label: account.platform, color: "#6366f1", accent: "", border: "border-t-indigo-500/40" };
  const isGrowthPositive = account.growthPct30d >= 0;

  return (
    <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden border-t-2 ${config.border} transition-shadow duration-200 hover:shadow-md hover:shadow-${account.platform === "tiktok" ? "cyan" : "pink"}-500/5`}>
      {/* Platform gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${config.accent}`} />

      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-start gap-3">
        {account.avatarUrl ? (
          <Image src={account.avatarUrl} alt={account.handle} width={48} height={48} className="rounded-full shrink-0" unoptimized />
        ) : (
          <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ color: config.color }}><PlatformIcon platform={account.platform} size={14} /></span>
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
          <h3 className="text-sm font-semibold truncate">{account.handle}</h3>
          {account.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{account.bio}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Followers</div>
          <div className="text-sm font-bold">
            {account.followers >= 1_000_000 ? `${(account.followers / 1_000_000).toFixed(1)}M` : `${(account.followers / 1_000).toFixed(1)}k`}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">30d Growth</div>
          <div className={`text-sm font-bold flex items-center gap-0.5 ${isGrowthPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isGrowthPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(account.growthPct30d)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Engagement</div>
          <div className="text-sm font-bold flex items-center gap-0.5">
            <Heart size={11} className="text-pink-400" />
            {account.avgEngagementRate}%
          </div>
        </div>
      </div>

      {/* Recent posts thumbnails */}
      {account.recentPosts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs text-muted-foreground mb-2">Recent Posts</div>
          <div className="grid grid-cols-6 gap-1.5">
            {account.recentPosts.slice(0, 6).map((post) => (
              <div key={post.id} className="aspect-square rounded-md overflow-hidden bg-muted relative group" title={post.title}>
                {post.thumbnailUrl ? (
                  <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover" sizes="60px" unoptimized />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <span className="text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity px-1 text-center line-clamp-2">{post.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentFarmPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["content-farm"],
    queryFn: fetchContentFarm,
    refetchInterval: 60_000,
  });

  const accounts = data?.accounts ?? [];
  const filtered = search
    ? accounts.filter(
        (a) =>
          a.handle.toLowerCase().includes(search.toLowerCase()) ||
          a.platform.toLowerCase().includes(search.toLowerCase())
      )
    : accounts;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Farm</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All accounts across Instagram and TikTok — followers, engagement, and recent posts.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by handle or platform..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-64 animate-skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((acc) => (
            <AccountCard key={acc.id} account={acc} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No accounts match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
