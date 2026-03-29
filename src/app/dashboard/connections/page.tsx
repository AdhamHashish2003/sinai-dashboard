"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Save,
  Instagram,
  Youtube,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConnectionData {
  id: string;
  platform: string;
  username: string;
  type: string;
  status: string;
  dataSource: string;
  avatarUrl: string | null;
  bio: string | null;
  lastFetchedAt: string | null;
  followers: number;
  engagementRate: number;
  createdAt: string;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#69C9D0",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
};

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.8a8.24 8.24 0 0 0 4.76 1.52V6.87a4.84 4.84 0 0 1-1-.18Z" />
    </svg>
  );
}

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  switch (platform) {
    case "tiktok": return <TikTokIcon size={size} />;
    case "instagram": return <Instagram size={size} />;
    case "youtube": return <Youtube size={size} />;
    default: return <Link2 size={size} />;
  }
}

function DataSourceBadge({ source }: { source: string }) {
  if (source === "api") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
      <span className="h-1 w-1 rounded-full bg-yellow-400" />
      Manual
    </span>
  );
}

function ConnectionCard({
  conn,
  onRefresh,
  onDelete,
  onSave,
  isRefreshing,
  isDeleting,
  isSaving,
}: {
  conn: ConnectionData;
  onRefresh: () => void;
  onDelete: () => void;
  onSave: (followers: number, engagementRate: number) => void;
  isRefreshing: boolean;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const [editFollowers, setEditFollowers] = useState(String(conn.followers));
  const [editEngagement, setEditEngagement] = useState(String(conn.engagementRate));
  const color = PLATFORM_COLORS[conn.platform] ?? "#6366f1";

  const followersChanged = Number(editFollowers) !== conn.followers;
  const engagementChanged = Number(editEngagement) !== conn.engagementRate;
  const hasChanges = followersChanged || engagementChanged;

  function handleSave() {
    const f = parseInt(editFollowers, 10);
    const e = parseFloat(editEngagement);
    if (isNaN(f) || f < 0 || isNaN(e) || e < 0 || e > 100) return;
    onSave(f, e);
  }

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-background/50 p-2" style={{ color }}>
            <PlatformIcon platform={conn.platform} size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{conn.username}</h3>
              <DataSourceBadge source={conn.dataSource} />
            </div>
            <p className="text-xs text-muted-foreground capitalize">{conn.platform} &middot; {conn.type}</p>
          </div>
        </div>
      </div>

      {/* Editable metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">Followers</label>
          <input
            type="number"
            min="0"
            value={editFollowers}
            onChange={(e) => setEditFollowers(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">Engagement %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={editEngagement}
            onChange={(e) => setEditEngagement(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {conn.lastFetchedAt && (
        <p className="text-[10px] text-muted-foreground mb-3">
          Last updated {formatDistanceToNow(new Date(conn.lastFetchedAt), { addSuffix: true })}
        </p>
      )}

      <div className="flex items-center gap-2">
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save size={12} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`${hasChanges ? "" : "flex-1 "}flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50`}
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "..." : "Refresh"}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center justify-center rounded-md border border-border px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: (): Promise<{ connections: ConnectionData[] }> =>
      fetch("/api/connections").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: { platform: string; username: string; type: string }) =>
      fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error ?? "Failed to create");
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["content-farm"] });
      setUsername("");
    },
  });

  function handleRefresh(id: string) {
    setRefreshingId(id);
    fetch(`/api/connections/${id}/fetch`, { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["content-farm"] });
      })
      .finally(() => setRefreshingId(null));
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    fetch(`/api/connections/${id}`, { method: "DELETE" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["content-farm"] });
      })
      .finally(() => setDeletingId(null));
  }

  function handleSave(id: string, followers: number, engagementRate: number) {
    setSavingId(id);
    fetch(`/api/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followers, engagementRate }),
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["content-farm"] });
      })
      .finally(() => setSavingId(null));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    createMutation.mutate({ platform, username: username.trim(), type: "social" });
  }

  const connections = data?.connections ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect social accounts and websites. Edit metrics manually or let the auto-refresh engine pull live data.
        </p>
      </div>

      {/* Add connection form */}
      <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@imperiumstoicc"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !username.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <Plus size={14} />
            {createMutation.isPending ? "Adding..." : "Add Connection"}
          </button>
        </div>
        {createMutation.isError && (
          <p className="text-xs text-red-400 mt-2">{createMutation.error.message}</p>
        )}
      </form>

      {/* Connections grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-56 animate-skeleton" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Link2 size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No connections yet. Add your first account above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              onRefresh={() => handleRefresh(conn.id)}
              onDelete={() => handleDelete(conn.id)}
              onSave={(f, e) => handleSave(conn.id, f, e)}
              isRefreshing={refreshingId === conn.id}
              isDeleting={deletingId === conn.id}
              isSaving={savingId === conn.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
