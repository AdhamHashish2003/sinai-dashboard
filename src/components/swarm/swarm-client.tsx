"use client";

import { useState } from "react";
import {
  Bug,
  Copy,
  Check,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  Clock,
  Send,
  History,
  Play,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DraftVersion {
  body: string;
  createdAt?: string;
  note?: string;
}

interface Reply {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  signalId: string;
  signalTitle: string;
  signalBody: string;
  signalAuthor: string;
  signalSource: string;
  signalUrl: string;
  signalScore: number;
  signalReason: string;
  draftBody: string;
  draftVersions: DraftVersion[];
  status: string;
  platform: string;
  notes: string;
  createdAt: string;
  postedAt: string;
}

interface Props {
  replies: Reply[];
}

const STATUS_LABELS: Record<string, string> = {
  pending_draft: "Pending Draft",
  ready_to_post: "Ready to Post",
  posted: "Posted",
  rejected: "Rejected",
};

const STATUS_ORDER = ["pending_draft", "ready_to_post", "posted", "rejected"];

const STATUS_STYLES: Record<string, string> = {
  pending_draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ready_to_post: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  posted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  rejected: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

function ReplyCard({
  reply,
  onAction,
  busy,
}: {
  reply: Reply;
  onAction: (id: string, action: "post" | "reject" | "regenerate" | "copy") => Promise<void>;
  busy: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reply.draftBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      // Also push to Telegram for phone access
      await onAction(reply.id, "copy");
    } catch (err) {
      console.error("clipboard failed:", err);
    }
  }

  const isPending = reply.status === "pending_draft";
  const isPosted = reply.status === "posted";
  const isRejected = reply.status === "rejected";

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-opacity ${
        isPosted || isRejected ? "opacity-60" : ""
      } ${STATUS_STYLES[reply.status]?.split(" ").find((c) => c.startsWith("border-")) ?? "border-border"}`}
    >
      {/* Header: signal context */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold font-mono tabular-nums bg-primary/10 text-primary">
              {reply.signalScore}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 capitalize">
              {reply.signalSource === "hackernews" ? "HN" : reply.signalSource}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {reply.productSlug}
            </span>
            <span className="text-[10px] text-muted-foreground">
              by {reply.signalAuthor}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
            </span>
          </div>

          <h3 className="text-sm font-semibold line-clamp-1">
            {reply.signalTitle || "(untitled)"}
          </h3>
          <p className="text-xs text-primary/80 italic mt-1 line-clamp-1">
            {reply.signalReason}
          </p>
        </div>

        <a
          href={reply.signalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Open source"
        >
          <ExternalLink size={11} />
          Source
        </a>
      </div>

      {/* Draft body */}
      {isPending ? (
        <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4 mb-3 flex items-center gap-2 text-xs text-amber-400">
          <Clock size={14} className="animate-pulse" />
          Drafting with Claude Sonnet 4.6… typically ready within 2 minutes.
        </div>
      ) : (
        <div className="mb-3">
          <textarea
            value={reply.draftBody}
            readOnly
            rows={Math.min(10, Math.max(4, reply.draftBody.split("\n").length + 1))}
            className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {reply.draftBody.split(/\s+/).filter(Boolean).length} words &middot;{" "}
              {reply.draftBody.length} chars
            </span>
            {reply.draftVersions.length > 1 && (
              <button
                onClick={() => setShowHistory((h) => !h)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <History size={10} />
                {reply.draftVersions.length} versions
              </button>
            )}
          </div>

          {showHistory && reply.draftVersions.length > 1 && (
            <div className="mt-2 space-y-2">
              {reply.draftVersions.slice(0, -1).map((v, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-background/30 p-2 text-[11px] text-muted-foreground"
                >
                  <div className="text-[9px] uppercase text-muted-foreground/70 mb-1">
                    Version {i + 1}
                    {v.note && <span> &middot; {v.note}</span>}
                  </div>
                  <div className="font-mono whitespace-pre-wrap">{v.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isPending && !isPosted && !isRejected && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied + Sent" : "Copy + Telegram"}
          </button>
          <button
            onClick={() => onAction(reply.id, "post")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={12} />
            Mark Posted
          </button>
          <button
            onClick={() => onAction(reply.id, "regenerate")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
          <button
            onClick={() => onAction(reply.id, "reject")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 ml-auto"
          >
            <X size={12} />
            Reject
          </button>
        </div>
      )}

      {isPosted && reply.postedAt && (
        <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
          <Send size={11} />
          Posted {formatDistanceToNow(new Date(reply.postedAt), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}

export function SwarmClient({ replies: initial }: Props) {
  const [replies, setReplies] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function handleGenerateAll() {
    setRunningAll(true);
    setRunMessage("Processing pending drafts with Groq llama-3.3-70b…");
    try {
      const res = await fetch("/api/swarm/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setRunMessage(
          `Done: ${data.drafted}/${data.processed} drafts generated${data.telegramSent ? ` · ${data.telegramSent} pushed to Telegram` : ""}`
        );
        // Pull fresh data — a full reload is simpler than reconciling state
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setRunMessage(`Swarm failed: ${data.error ?? "unknown"}`);
      }
    } catch (err) {
      setRunMessage(`Swarm error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setRunningAll(false);
      setTimeout(() => setRunMessage(null), 6000);
    }
  }

  async function handleAction(
    id: string,
    action: "post" | "reject" | "regenerate" | "copy"
  ) {
    setBusyId(id);
    try {
      if (action === "copy") {
        await fetch(`/api/replies/${id}/telegram`, { method: "POST" });
        return;
      }

      const res = await fetch(`/api/replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;

      setReplies((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (action === "post") {
            return { ...r, status: "posted", postedAt: new Date().toISOString() };
          }
          if (action === "reject") {
            return { ...r, status: "rejected" };
          }
          if (action === "regenerate") {
            return { ...r, status: "pending_draft", draftBody: "" };
          }
          return r;
        })
      );
    } finally {
      setBusyId(null);
    }
  }

  const grouped: Record<string, Reply[]> = {
    pending_draft: [],
    ready_to_post: [],
    posted: [],
    rejected: [],
  };
  for (const r of replies) {
    (grouped[r.status] ?? grouped.ready_to_post).push(r);
  }

  const totalActive = grouped.pending_draft.length + grouped.ready_to_post.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight lf-scanline">
            <span className="lf-dot lf-dot-orange mr-2" />
            Swarm
          </h2>
          <p className="text-xs mt-2" style={{ color: "var(--lf-text-dim)" }}>
            llama-3.3-70b reply drafter · Copy → paste to Reddit → mark posted
          </p>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={runningAll || grouped.pending_draft.length === 0}
          className={`lf-btn lf-btn-primary ${grouped.pending_draft.length > 0 && !runningAll ? "lf-btn-pulse" : ""}`}
          title={
            grouped.pending_draft.length === 0
              ? "No pending drafts — queue one from /dashboard/radar"
              : `Generate ${grouped.pending_draft.length} pending draft${grouped.pending_draft.length !== 1 ? "s" : ""}`
          }
        >
          {runningAll ? (
            <>
              <div className="lf-radar" style={{ width: 16, height: 16 }}>
                <div className="lf-radar-sweep" />
              </div>
              Generating…
            </>
          ) : (
            <>
              <Play size={12} /> Generate All Pending ({grouped.pending_draft.length})
            </>
          )}
        </button>
      </div>

      {runMessage && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-xs"
          style={{
            background: "rgba(255, 107, 0, 0.05)",
            border: "1px solid var(--lf-border-hover)",
            color: "var(--lf-orange)",
          }}
        >
          {runMessage}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`rounded-lg border p-3 ${STATUS_STYLES[status] ?? "border-border bg-card"}`}
          >
            <div className="text-xs opacity-80">{STATUS_LABELS[status]}</div>
            <div className="text-2xl font-bold font-mono">
              {grouped[status]?.length ?? 0}
            </div>
          </div>
        ))}
      </div>

      {totalActive === 0 && grouped.posted.length === 0 && grouped.rejected.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Bug size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No replies yet. Click &ldquo;Draft Reply&rdquo; on a signal in /radar to queue one.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const group = grouped[status] ?? [];
            if (group.length === 0) return null;
            return (
              <section key={status}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {STATUS_LABELS[status]} &middot; {group.length}
                </h3>
                <div className="space-y-3">
                  {group.map((r) => (
                    <ReplyCard
                      key={r.id}
                      reply={r}
                      onAction={handleAction}
                      busy={busyId === r.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
