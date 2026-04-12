"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useState } from "react";
import {
  Radar as RadarIcon,
  Bug,
  Users,
  FileText,
  Search,
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
  Send,
} from "lucide-react";

type Period = "7d" | "30d" | "90d";

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  products: Product[];
  period: Period;
  productId: string | null;
  summary: {
    signals: number;
    replies: number;
    leads: number;
    content: number;
  };
  radar: {
    perDay: Array<{ date: string; count: number; avgScore: number }>;
    scoreDist: Array<{ score: number; count: number }>;
    topSubs: Array<{ subreddit: string; count: number }>;
  };
  swarm: {
    drafted: number;
    approved: number;
    posted: number;
    rejected: number;
    pendingDraft: number;
    approvalRate: number | null;
    avgHoursToPost: number | null;
  };
  crm: {
    statusCounts: Record<string, number>;
    funnel: Array<{ status: string; count: number }>;
    perDay: Array<{ date: string; count: number }>;
    sources: Array<{ source: string; count: number }>;
    staleContacted: number;
  };
  content: {
    statusCounts: Record<string, number>;
    byType: Array<{ postType: string; count: number }>;
    topEngagement: Array<{
      id: string;
      postType: string;
      topic: string;
      postedEngagement: number | null;
      postedAt: Date | null;
    }>;
  };
  actions: Array<{ priority: number; text: string; count: number }>;
}

// Orange + white palette to match house style
const ACCENT = "#FF6B00";
const MUTED = "#71717a";
const CHART_COLORS = ["#FF6B00", "#FF8533", "#FFAA66", "#FFC299", "#FFD6BB"];

const STATUS_STYLES: Record<string, string> = {
  new: "text-blue-400",
  enriched: "text-cyan-400",
  contacted: "text-amber-400",
  replied: "text-purple-400",
  trial: "text-indigo-400",
  paid: "text-emerald-400",
  dead: "text-zinc-500",
};

const POST_TYPE_LABELS: Record<string, string> = {
  city_report: "City Report",
  fee_comparison: "Fee Compare",
  adu_case_study: "Case Study",
};

export function MetricsClient({
  products,
  period,
  productId,
  summary,
  radar,
  swarm,
  crm,
  content,
  actions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestMessage, setDigestMessage] = useState<string | null>(null);

  async function handleSendDigest() {
    setSendingDigest(true);
    setDigestMessage("Compiling digest…");
    try {
      const payload = productId ? { productId, mode: "daily" } : { mode: "daily" };
      const res = await fetch("/api/metrics/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const sent = (data.results ?? []).filter((r: { telegramSent: boolean }) => r.telegramSent).length;
        const skipped = (data.results ?? []).filter((r: { skipped: boolean }) => r.skipped).length;
        setDigestMessage(`Digest sent to ${sent} chat(s), ${skipped} skipped`);
      } else {
        setDigestMessage(`Failed: ${data.error ?? "unknown"}`);
      }
    } catch (err) {
      setDigestMessage(`Error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSendingDigest(false);
      setTimeout(() => setDigestMessage(null), 6000);
    }
  }

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "all" || value === "30d") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/dashboard/metrics?${params.toString()}`);
  }

  const periodLabel =
    period === "7d" ? "last 7 days" : period === "90d" ? "last 90 days" : "last 30 days";

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight lf-scanline">
            <span className="lf-dot lf-dot-live mr-2" />
            Overview
          </h2>
          <p className="text-xs mt-2" style={{ color: "var(--lf-text-dim)" }}>
            Unified command center across Radar, Swarm, CRM, and Content Flywheel
          </p>
        </div>

        <button
          onClick={handleSendDigest}
          disabled={sendingDigest}
          className="lf-btn"
        >
          {sendingDigest ? (
            <>
              <div className="lf-radar" style={{ width: 14, height: 14 }}>
                <div className="lf-radar-sweep" />
              </div>
              Sending…
            </>
          ) : (
            <>
              <Send size={12} /> Send Digest Now
            </>
          )}
        </button>
      </div>

      {digestMessage && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-xs"
          style={{
            background: "rgba(255, 107, 0, 0.05)",
            border: "1px solid var(--lf-border-hover)",
            color: "var(--lf-orange)",
          }}
        >
          {digestMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={productId ?? "all"}
          onChange={(e) => update("productId", e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => update("period", p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">{periodLabel}</span>
      </div>

      {/* Action Items strip */}
      {actions.length > 0 && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
              Action Items
            </h3>
          </div>
          <ul className="space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="text-xs text-foreground">
                <span className="text-primary mr-1.5">⚡</span>
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <SummaryCard
          icon={RadarIcon}
          label="Signals Found"
          value={summary.signals}
          sub="Radar"
        />
        <SummaryCard
          icon={Bug}
          label="Replies Drafted"
          value={summary.replies}
          sub="Swarm"
        />
        <SummaryCard
          icon={Users}
          label="Leads"
          value={summary.leads}
          sub="CRM"
        />
        <SummaryCard
          icon={FileText}
          label="Content Posts"
          value={summary.content}
          sub="Flywheel"
        />
      </div>

      {/* Section 1: Radar Health */}
      <Section
        title="Radar Health"
        icon={RadarIcon}
        empty={radar.perDay.length === 0}
        emptyText="No signals yet — wire up the radar worker cron to populate."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sparkline + avg score trend */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Signals Per Day
              </h4>
              <span className="text-[10px] text-muted-foreground">
                {radar.perDay.reduce((a, b) => a + b.count, 0)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={radar.perDay}>
                <defs>
                  <linearGradient id="sigGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: MUTED }}
                  tickFormatter={(d: string) => d.slice(5)}
                  stroke={MUTED}
                />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} />
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#sigGrad)"
                  name="Signals"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Score distribution */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Score Distribution
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={radar.scoreDist}>
                <XAxis dataKey="score" tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} />
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top subs */}
        {radar.topSubs.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Top Subreddits
            </h4>
            <div className="space-y-2">
              {radar.topSubs.map((s) => (
                <div key={s.subreddit} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-primary w-32 shrink-0">
                    /r/{s.subreddit}
                  </span>
                  <div className="flex-1 h-5 bg-background rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-primary/50"
                      style={{
                        width: `${(s.count / radar.topSubs[0].count) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Section 2: Swarm Performance */}
      <Section
        title="Swarm Performance"
        icon={Bug}
        empty={swarm.drafted === 0}
        emptyText="No drafts yet — click 'Draft Reply' on a signal in /radar to queue one."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stacked status bar */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Draft Lifecycle
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  {
                    name: periodLabel,
                    Pending: swarm.pendingDraft,
                    Ready: swarm.approved,
                    Posted: swarm.posted,
                    Rejected: swarm.rejected,
                  },
                ]}
                layout="vertical"
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Ready" stackId="a" fill={ACCENT} />
                <Bar dataKey="Posted" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Rejected" stackId="a" fill="#71717a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* KPI cards */}
          <div className="space-y-3">
            <KpiCard
              label="Approval Rate"
              value={
                swarm.approvalRate != null
                  ? `${swarm.approvalRate.toFixed(0)}%`
                  : "—"
              }
              sub={`${swarm.posted} posted / ${swarm.posted + swarm.rejected} decided`}
              icon={TrendingUp}
            />
            <KpiCard
              label="Avg Time-to-Post"
              value={
                swarm.avgHoursToPost != null
                  ? `${swarm.avgHoursToPost.toFixed(1)}h`
                  : "—"
              }
              sub="signal → posted"
              icon={Clock}
            />
          </div>
        </div>
      </Section>

      {/* Section 3: CRM Pipeline */}
      <Section
        title="CRM Pipeline"
        icon={Users}
        empty={Object.values(crm.statusCounts).every((v) => v === 0)}
        emptyText="No leads yet — click 'Run Scout' on /crm to pull CSLB-licensed ADU builders."
      >
        {/* Funnel */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Conversion Funnel
          </h4>
          <Funnel stages={crm.funnel} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads per day */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Leads Added Per Day
            </h4>
            {crm.perDay.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                No lead activity in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={crm.perDay}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke={MUTED} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="count" stroke={ACCENT} fill="url(#leadGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top sources */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Top Lead Sources
            </h4>
            {crm.sources.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                No lead sources in period
              </div>
            ) : (
              <div className="space-y-2">
                {crm.sources.map((s) => {
                  const max = crm.sources[0].count;
                  return (
                    <div key={s.source} className="flex items-center gap-3">
                      <span className="text-xs capitalize w-20 shrink-0">{s.source}</span>
                      <div className="flex-1 h-5 bg-background rounded-sm overflow-hidden">
                        <div className="h-full bg-primary/50" style={{ width: `${(s.count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                        {s.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Section 4: Content Flywheel */}
      <Section
        title="Content Flywheel"
        icon={FileText}
        empty={Object.values(content.statusCounts).every((v) => v === 0)}
        emptyText="No proof posts yet — the content worker runs daily at 7am PT."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status breakdown */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Posts by Status
            </h4>
            <div className="space-y-2">
              {["draft", "approved", "posted", "rejected", "failed"].map((s) => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{s}</span>
                  <span className="font-mono">{content.statusCounts[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Post type pie */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              By Post Type
            </h4>
            {content.byType.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                No posts
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={content.byType}
                    dataKey="count"
                    nameKey="postType"
                    cx="50%"
                    cy="50%"
                    outerRadius={55}
                    label={(e: { postType?: string; count?: number }) =>
                      POST_TYPE_LABELS[e.postType ?? ""] ?? e.postType ?? ""
                    }
                    labelLine={false}
                    fontSize={9}
                  >
                    {content.byType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top engagement */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Top by Engagement
            </h4>
            {content.topEngagement.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No engagement data yet — enter upvotes/likes manually on posted content.
              </div>
            ) : (
              <ul className="space-y-2">
                {content.topEngagement.map((p) => (
                  <li key={p.id} className="text-xs">
                    <div className="font-semibold line-clamp-1">{p.topic}</div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>{POST_TYPE_LABELS[p.postType] ?? p.postType}</span>
                      <span className="font-mono text-primary">
                        {p.postedEngagement ?? 0}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* Section 5: SEO Factory (placeholder — module not built yet) */}
      <Section title="SEO Factory" icon={Search} empty={true} emptyText="SEO module not built yet — will populate when the SEO worker ships.">
        <div />
      </Section>

      {/* Section 6: Legacy Sinai metrics navigation */}
      <Section title="Legacy Sinai Metrics" icon={Activity}>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">
            The original SaaS Overview (MRR, users, webhooks) and Instagram tracking pages are preserved as sub-tabs:
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/metrics/saas"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
            >
              → SaaS Overview
            </a>
            <a
              href="/dashboard/metrics/instagram"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
            >
              → Instagram
            </a>
            <a
              href="/dashboard/metrics/analytics"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
            >
              → Analytics
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon size={14} className="text-primary" />
        <span className="text-[10px] uppercase text-muted-foreground">{sub}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-primary" />
        <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  empty,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {empty ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <p className="text-xs text-muted-foreground">{emptyText ?? "No data yet."}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Funnel({ stages }: { stages: Array<{ status: string; count: number }> }) {
  const total = stages[0]?.count ?? 0;
  if (total === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-6">
        No leads in the funnel yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].count : stage.count;
        const pct = total > 0 ? (stage.count / total) * 100 : 0;
        const stagePct = prev > 0 ? (stage.count / prev) * 100 : 100;
        return (
          <div key={stage.status} className="flex items-center gap-3">
            <span className={`text-xs capitalize w-20 shrink-0 ${STATUS_STYLES[stage.status] ?? "text-muted-foreground"}`}>
              {stage.status}
            </span>
            <div className="flex-1 h-7 bg-background rounded-sm overflow-hidden relative">
              <div
                className="h-full bg-primary/40 flex items-center px-2"
                style={{ width: `${Math.max(pct, 2)}%` }}
              >
                <span className="text-[10px] text-foreground font-mono">{stage.count}</span>
              </div>
            </div>
            <span className="text-[10px] text-primary font-mono w-14 text-right">
              {i > 0 ? `${stagePct.toFixed(0)}% ↓` : `${pct.toFixed(0)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
