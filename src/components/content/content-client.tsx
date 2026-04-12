"use client";

import { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  Send,
  Clock,
  History,
  Play,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProofPost {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  postType: string;
  topic: string;
  generatedBody: string;
  generatedAssets: string[];
  targetPlatforms: string[];
  postedPlatforms: string[];
  draftVersions: Array<{ body: string; note?: string }>;
  status: string;
  postedEngagement: number;
  errorMessage: string;
  scheduledFor: string;
  postedAt: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  products: Product[];
  posts: ProofPost[];
}

const STATUS_ORDER = ["draft", "approved", "posted", "rejected", "failed"];
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  posted: "Posted",
  rejected: "Rejected",
  failed: "Failed",
};
const STATUS_STYLES: Record<string, string> = {
  draft: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  approved: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  posted: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  rejected: "border-zinc-500/20 bg-zinc-500/5 text-zinc-500",
  failed: "border-red-500/30 bg-red-500/5 text-red-400",
};

const POST_TYPE_LABELS: Record<string, string> = {
  city_report: "City Report",
  fee_comparison: "Fee Comparison",
  adu_case_study: "ADU Case Study",
};

const PLATFORM_STYLES: Record<string, string> = {
  reddit: "bg-orange-500/10 text-orange-400",
  linkedin: "bg-blue-500/10 text-blue-400",
  twitter: "bg-zinc-500/10 text-zinc-300",
  biggerpockets: "bg-emerald-500/10 text-emerald-400",
};

export function ContentClient({ products, posts: initial }: Props) {
  const [posts, setPosts] = useState(initial);
  const [productFilter, setProductFilter] = useState<string>(products[0]?.id ?? "all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markPostedForId, setMarkPostedForId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [generatePostType, setGeneratePostType] = useState("city_report");

  const filtered = posts.filter(
    (p) => productFilter === "all" || p.productId === productFilter
  );

  const grouped: Record<string, ProofPost[]> = {
    draft: [],
    approved: [],
    posted: [],
    rejected: [],
    failed: [],
  };
  for (const p of filtered) {
    (grouped[p.status] ?? grouped.draft).push(p);
  }

  async function act(
    id: string,
    action: "approve" | "reject" | "regenerate",
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (action === "approve") return { ...p, status: "approved" };
          if (action === "reject") return { ...p, status: "rejected" };
          if (action === "regenerate")
            return {
              ...p,
              status: "draft",
              draftVersions: [...p.draftVersions, { body: p.generatedBody, note: "pre-regenerate" }],
              generatedBody: "",
            };
          return p;
        })
      );

      if (action === "approve") {
        // Fire-and-forget Telegram push
        await fetch(`/api/content/${id}/telegram`, { method: "POST" });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function markPosted(id: string, platforms: string[]) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_posted", postedPlatforms: platforms }),
      });
      if (!res.ok) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "posted", postedAt: new Date().toISOString(), postedPlatforms: platforms }
            : p
        )
      );
      setMarkPostedForId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateNow(postType: string) {
    if (productFilter === "all") {
      setMessage("Select a product first");
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setRunning(true);
    setMessage(`Generating ${postType.replace("_", " ")} with Groq llama-3.3-70b…`);
    try {
      const res = await fetch("/api/content/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productFilter, postType }),
      });
      const body = await res.json();
      if (res.ok) {
        setMessage(`Generated "${body.topic}" (${body.charCount} chars)${body.telegramSent ? " · Telegram sent" : ""}`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage(`Error: ${body.error ?? "unknown"}${body.detail ? ` — ${body.detail}` : ""}`);
      }
    } finally {
      setRunning(false);
      setTimeout(() => setMessage(null), 8000);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight lf-scanline">
          <span className="lf-dot lf-dot-orange mr-2" />
          Content Flywheel
        </h2>
        <p className="text-xs mt-2" style={{ color: "var(--lf-text-dim)" }}>
          Daily Groq-generated proof posts · Approve → Copy → paste to Reddit / LinkedIn / BiggerPockets → Mark Posted
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          {products.length > 1 && <option value="all">All Products</option>}
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={generatePostType}
          onChange={(e) => setGeneratePostType(e.target.value)}
          disabled={running}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
          title="Post type to generate"
        >
          <option value="city_report">City Report</option>
          <option value="fee_comparison">Fee Comparison</option>
          <option value="adu_case_study">ADU Case Study</option>
        </select>

        <button
          onClick={() => handleGenerateNow(generatePostType)}
          disabled={running}
          className="lf-btn lf-btn-primary lf-btn-pulse"
        >
          {running ? (
            <>
              <div className="lf-radar" style={{ width: 16, height: 16 }}>
                <div className="lf-radar-sweep" />
              </div>
              Generating…
            </>
          ) : (
            <>
              <Play size={12} /> Generate Now
            </>
          )}
        </button>

        <span className="text-xs ml-auto" style={{ color: "var(--lf-text-dim)" }}>
          {filtered.length} post{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {message}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`rounded-lg border p-2.5 ${STATUS_STYLES[status]}`}
          >
            <div className="text-[10px] opacity-80">{STATUS_LABELS[status]}</div>
            <div className="text-xl font-bold font-mono">
              {grouped[status]?.length ?? 0}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No proof posts yet. The content worker runs daily at 7am PT. Click Generate Now for a manual run.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const group = grouped[status];
            if (!group || group.length === 0) return null;
            return (
              <section key={status}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {STATUS_LABELS[status]} · {group.length}
                </h3>
                <div className="space-y-3">
                  {group.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      busy={busyId === post.id}
                      onAction={act}
                      onMarkPosted={() => setMarkPostedForId(post.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {markPostedForId && (
        <MarkPostedModal
          post={posts.find((p) => p.id === markPostedForId)!}
          onConfirm={(platforms) => markPosted(markPostedForId, platforms)}
          onClose={() => setMarkPostedForId(null)}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  busy,
  onAction,
  onMarkPosted,
}: {
  post: ProofPost;
  busy: boolean;
  onAction: (id: string, action: "approve" | "reject" | "regenerate") => void;
  onMarkPosted: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isDraft = post.status === "draft";
  const isApproved = post.status === "approved";
  const isPosted = post.status === "posted";
  const isFailed = post.status === "failed";
  const isRejected = post.status === "rejected";
  const isEmpty = !post.generatedBody;

  async function copy() {
    try {
      await navigator.clipboard.writeText(post.generatedBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${
        isPosted || isRejected ? "opacity-60" : ""
      } ${STATUS_STYLES[post.status]?.split(" ").find((c) => c.startsWith("border-")) ?? "border-border"} bg-card`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {POST_TYPE_LABELS[post.postType] ?? post.postType}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {post.productSlug}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            {post.targetPlatforms.map((p) => (
              <span
                key={p}
                className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  PLATFORM_STYLES[p] ?? "bg-zinc-500/10 text-zinc-400"
                }`}
              >
                {p}
              </span>
            ))}
          </div>
          <h3 className="text-sm font-semibold line-clamp-1">{post.topic}</h3>
        </div>

        {post.generatedAssets.length > 0 && (
          <a
            href={post.generatedAssets[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
            title="Open PDF"
          >
            <ExternalLink size={11} />
            PDF
          </a>
        )}
      </div>

      {/* Body */}
      {isFailed ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 mb-3 flex items-start gap-2 text-xs text-red-400">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">Generation failed</div>
            <div className="text-[11px]">{post.errorMessage ?? "unknown error"}</div>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3 mb-3 flex items-center gap-2 text-xs text-amber-400">
          <Clock size={14} className="animate-pulse" />
          Awaiting worker run — manual generation queued.
        </div>
      ) : (
        <div className="mb-3">
          <textarea
            value={post.generatedBody}
            readOnly
            rows={Math.min(14, Math.max(5, post.generatedBody.split("\n").length + 1))}
            className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {post.generatedBody.split(/\s+/).filter(Boolean).length} words ·{" "}
              {post.generatedBody.length} chars
            </span>
            {post.draftVersions.length > 1 && (
              <button
                onClick={() => setShowHistory((h) => !h)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <History size={10} />
                {post.draftVersions.length} versions
              </button>
            )}
          </div>

          {showHistory && post.draftVersions.length > 1 && (
            <div className="mt-2 space-y-2">
              {post.draftVersions.slice(0, -1).map((v, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-background/30 p-2 text-[11px] text-muted-foreground"
                >
                  <div className="text-[9px] uppercase text-muted-foreground/70 mb-1">
                    Version {i + 1}
                    {v.note && <span> · {v.note}</span>}
                  </div>
                  <div className="font-mono whitespace-pre-wrap">{v.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isEmpty && !isPosted && !isRejected && !isFailed && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copy}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>

          {isDraft && (
            <button
              onClick={() => onAction(post.id, "approve")}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              Approve + Telegram
            </button>
          )}

          {isApproved && (
            <button
              onClick={onMarkPosted}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              <Send size={12} />
              Mark Posted
            </button>
          )}

          <button
            onClick={() => onAction(post.id, "regenerate")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>

          <button
            onClick={() => onAction(post.id, "reject")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 ml-auto"
          >
            <X size={12} />
            Reject
          </button>
        </div>
      )}

      {isPosted && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-blue-400">
          <Send size={11} />
          Posted{" "}
          {post.postedAt &&
            formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
          {post.postedPlatforms.length > 0 && (
            <>
              · to:{" "}
              {post.postedPlatforms.map((p) => (
                <span key={p} className="text-muted-foreground">
                  {p}
                </span>
              ))}
            </>
          )}
          {post.postedEngagement > 0 && (
            <span className="ml-2 text-muted-foreground">
              · {post.postedEngagement} engagements
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MarkPostedModal({
  post,
  onConfirm,
  onClose,
}: {
  post: ProofPost;
  onConfirm: (platforms: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(post.targetPlatforms)
  );

  function toggle(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Which platforms did you post to?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Check every platform this was pasted into.
        </p>
        <div className="space-y-2 mb-5">
          {["reddit", "linkedin", "biggerpockets", "twitter"].map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(p)}
                onChange={() => toggle(p)}
                className="rounded"
              />
              <span className="text-xs capitalize">{p}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Mark Posted
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
