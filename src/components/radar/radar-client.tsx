"use client";

import { useState } from "react";
import {
  Radar,
  ExternalLink,
  X,
  FileEdit,
  ArrowUpDown,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Signal {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  source: string;
  sourceUrl: string;
  title: string;
  body: string;
  author: string;
  score: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  signals: Signal[];
  products: Product[];
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  dismissed: "bg-zinc-500/10 text-zinc-500",
  ready_to_draft: "bg-amber-500/10 text-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  approved: "Approved",
  dismissed: "Dismissed",
  ready_to_draft: "Ready to Draft",
};

const SOURCE_STYLES: Record<string, string> = {
  reddit: "bg-orange-500/10 text-orange-400",
  hackernews: "bg-[#FF6B00]/10 text-[#FF6B00]",
};

function ScoreBadge({ score }: { score: number }) {
  let color = "text-zinc-400 bg-zinc-500/10";
  if (score >= 9) color = "text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/20";
  else if (score >= 8) color = "text-emerald-400 bg-emerald-500/10";
  else if (score >= 7) color = "text-amber-400 bg-amber-500/10";

  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold font-mono tabular-nums ${color}`}>
      {score}
    </span>
  );
}

export function RadarClient({ signals: initial, products }: Props) {
  const [signals, setSignals] = useState(initial);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSignals((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status } : s))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = signals
    .filter((s) => productFilter === "all" || s.productId === productFilter)
    .filter((s) => statusFilter === "all" || s.status === statusFilter)
    .sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));

  const counts = {
    total: signals.length,
    new: signals.filter((s) => s.status === "new").length,
    highIntent: signals.filter((s) => s.score >= 9).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Radar</h2>
        <p className="text-muted-foreground text-sm mt-1">
          High-intent signals from Reddit and Hacker News, scored by AI.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Total Signals</div>
          <div className="text-2xl font-bold font-mono">{counts.total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">New (Unreviewed)</div>
          <div className="text-2xl font-bold font-mono text-blue-400">{counts.new}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Score 9-10</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{counts.highIntent}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="approved">Approved</option>
          <option value="ready_to_draft">Ready to Draft</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <button
          onClick={() => setSortDesc((d) => !d)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown size={12} />
          Score {sortDesc ? "High → Low" : "Low → High"}
        </button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} signal{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Signals table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Radar size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {signals.length === 0
              ? "No signals yet. The radar worker will populate this on its next run."
              : "No signals match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border border-border bg-card p-4 transition-opacity ${
                s.status === "dismissed" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Score */}
                <div className="pt-0.5">
                  <ScoreBadge score={s.score} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${
                        SOURCE_STYLES[s.source] ?? "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {s.source === "hackernews" ? "HN" : s.source}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        STATUS_STYLES[s.status] ?? STATUS_STYLES.new
                      }`}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      by {s.author}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {s.productSlug}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold mb-1 line-clamp-1">
                    {s.title || "(comment)"}
                  </h3>

                  {s.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {s.body.replace(/<[^>]*>/g, "").slice(0, 300)}
                    </p>
                  )}

                  {/* AI reason */}
                  <div className="flex items-start gap-1.5 mb-2">
                    <MessageSquare size={11} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary/80 italic">{s.reason}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.status !== "ready_to_draft" && s.status !== "dismissed" && (
                    <button
                      onClick={() => updateStatus(s.id, "ready_to_draft")}
                      disabled={updatingId === s.id}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                      title="Queue for draft reply"
                    >
                      <FileEdit size={11} />
                      Draft Reply
                    </button>
                  )}
                  {s.status !== "dismissed" && (
                    <button
                      onClick={() => updateStatus(s.id, "dismissed")}
                      disabled={updatingId === s.id}
                      className="flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-colors disabled:opacity-50"
                      title="Dismiss"
                    >
                      <X size={11} />
                    </button>
                  )}
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Open source"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
