"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { LaunchForm } from "@/types/launch";

type AiMeta = { model: string; generatedAt: string };

const EMPTY_FORM: LaunchForm = {
  core: { name: "", slug: "", tagline: "", icp: "", valueProp: "", freeTierHook: null },
  radar: { targetSubreddits: [], targetKeywords: [] },
  scout: { scoutState: "CA", scoutCities: [], scoutQueries: [] },
  content: { contentPostTypes: [], contentTopics: [] },
};

function ArrayEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  // Keep a local raw-string copy so the user can type newlines without them
  // being stripped mid-keystroke. Sync to parent on blur.
  const joined = value.join("\n");
  const [text, setText] = useState(joined);
  const prevJoined = useRef(joined);

  // If the parent replaced `value` (e.g., AI fill), sync the textarea.
  if (prevJoined.current !== joined) {
    prevJoined.current = joined;
    setText(joined);
  }

  function commit() {
    const arr = text.split("\n").map((s) => s.trim()).filter(Boolean);
    onChange(arr);
  }

  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        rows={Math.max(3, text.split("\n").length + 1)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <span className="block text-[10px] text-muted-foreground mt-1">One per line. Changes save when you click outside.</span>
    </label>
  );
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-border bg-card p-4 mb-3"
    >
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function LaunchWizardClient() {
  const router = useRouter();
  const [paragraph, setParagraph] = useState("");
  const [form, setForm] = useState<LaunchForm>(EMPTY_FORM);
  const [aiMeta, setAiMeta] = useState<AiMeta | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paragraphTooShort = paragraph.trim().length < 30;

  async function handleAiFill() {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/launches/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph: paragraph.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `AI fill failed (${res.status})`);
        return;
      }
      const { _meta, ...rest } = body as LaunchForm & { _meta: AiMeta };
      setForm(rest);
      setAiMeta(_meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCommit() {
    // Force any focused textarea to commit its pending edits before we send.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCommitLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          seed: paragraph.trim(),
          model: aiMeta?.model ?? "manual",
        }),
      });
      const body = await res.json();
      if (res.status === 409 && body.suggestions?.length) {
        setError(
          `Slug "${form.core.slug}" is taken. Try: ${body.suggestions.join(", ")}`
        );
        return;
      }
      if (!res.ok) {
        setError(body.error ?? `Commit failed (${res.status})`);
        return;
      }
      // Redirect to Products where the new card appears with a success banner.
      // The health strip shows "never" on everything until the operator triggers
      // the first Radar/Scout run — the banner links there.
      router.push(`/dashboard/products?just_launched=${encodeURIComponent(body.slug)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCommitLoading(false);
    }
  }

  function updateCore<K extends keyof LaunchForm["core"]>(key: K, v: LaunchForm["core"][K]) {
    setForm((f) => ({ ...f, core: { ...f.core, [key]: v } }));
  }

  return (
    <div>
      {/* Paragraph + AI button */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">
            Describe your launch
          </span>
          <textarea
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            placeholder="I'm launching Construction Scrap SF — I pick up demolition debris from GCs in the Bay Area and resell metal to recyclers."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <button
          onClick={handleAiFill}
          disabled={paragraphTooShort || aiLoading}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {aiLoading ? "Generating..." : "Fill with AI"}
        </button>
        {aiMeta && (
          <span className="ml-3 text-[11px] text-muted-foreground">
            Filled by {aiMeta.model}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400 mb-4">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Core */}
      <Section title="Core" defaultOpen>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Name</span>
          <input
            type="text"
            value={form.core.name}
            onChange={(e) => updateCore("name", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Slug</span>
          <input
            type="text"
            value={form.core.slug}
            onChange={(e) => updateCore("slug", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Tagline</span>
          <input
            type="text"
            value={form.core.tagline}
            onChange={(e) => updateCore("tagline", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">ICP</span>
          <textarea
            value={form.core.icp}
            onChange={(e) => updateCore("icp", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Value prop</span>
          <textarea
            value={form.core.valueProp}
            onChange={(e) => updateCore("valueProp", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Free-tier hook (optional)</span>
          <input
            type="text"
            value={form.core.freeTierHook ?? ""}
            onChange={(e) => updateCore("freeTierHook", e.target.value || null)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
      </Section>

      {/* Radar */}
      <Section title="Radar — Reddit/HN signal targeting">
        <ArrayEditor
          label="Subreddits (no r/ prefix)"
          value={form.radar.targetSubreddits}
          onChange={(v) => setForm((f) => ({ ...f, radar: { ...f.radar, targetSubreddits: v } }))}
          placeholder={"Construction\nsanfrancisco\nsmallbusiness"}
        />
        <ArrayEditor
          label="Keywords (for Hacker News)"
          value={form.radar.targetKeywords}
          onChange={(v) => setForm((f) => ({ ...f, radar: { ...f.radar, targetKeywords: v } }))}
          placeholder={"demolition waste\nscrap metal pickup"}
        />
      </Section>

      {/* Scout */}
      <Section title="Scout — Google Places lead gen">
        <label className="block">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">State (2-letter)</span>
          <input
            type="text"
            value={form.scout.scoutState}
            maxLength={2}
            onChange={(e) =>
              setForm((f) => ({ ...f, scout: { ...f.scout, scoutState: e.target.value.toUpperCase() } }))
            }
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>
        <ArrayEditor
          label="Cities"
          value={form.scout.scoutCities}
          onChange={(v) => setForm((f) => ({ ...f, scout: { ...f.scout, scoutCities: v } }))}
          placeholder={"San Francisco\nOakland\nSan Jose"}
        />
        <ArrayEditor
          label="Search queries"
          value={form.scout.scoutQueries}
          onChange={(v) => setForm((f) => ({ ...f, scout: { ...f.scout, scoutQueries: v } }))}
          placeholder={"demolition contractor\ngeneral contractor"}
        />
      </Section>

      {/* Content */}
      <Section title="Content — proof post templates">
        <ArrayEditor
          label="Post types"
          value={form.content.contentPostTypes}
          onChange={(v) => setForm((f) => ({ ...f, content: { ...f.content, contentPostTypes: v } }))}
          placeholder={"city_report\nfee_comparison\ncase_study"}
        />
        <ArrayEditor
          label="Topics"
          value={form.content.contentTopics}
          onChange={(v) => setForm((f) => ({ ...f, content: { ...f.content, contentTopics: v } }))}
          placeholder={"SF C&D metal pricing weekly"}
        />
      </Section>

      <button
        onClick={handleCommit}
        disabled={commitLoading || !form.core.name || !form.core.slug}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {commitLoading ? "Launching..." : "Launch"}
      </button>
    </div>
  );
}
