"use client";

import {
  Radar,
  Bug,
  Users,
  FileText,
  Search,
  BarChart3,
  Package,
  Layers,
  Rocket,
} from "lucide-react";
import { SignInButton } from "@/components/auth/sign-in-button";

const MODULES = [
  {
    icon: Radar,
    title: "Radar",
    desc: "Reddit + Hacker News monitoring with llama-3.3-70b intent scoring. Surfaces 9-10 buyer signals from 7 subreddits every 30 minutes.",
    delay: 0,
  },
  {
    icon: Bug,
    title: "Swarm",
    desc: "AI reply drafter for high-intent signals. Reddit-native tone, max 150 words, Telegram push, copy-paste-post manual loop.",
    delay: 80,
  },
  {
    icon: Users,
    title: "CRM",
    desc: "Drag-and-drop kanban from new → enriched → contacted → trial → paid. CSV export, manual entry, scout integration.",
    delay: 160,
  },
  {
    icon: FileText,
    title: "Content Flywheel",
    desc: "Daily proof posts via 3 rotating prompt templates: city report, fee comparison, ADU case study. Population-weighted city picker.",
    delay: 240,
  },
  {
    icon: Search,
    title: "SEO Factory",
    desc: "City-level permit pages indexed for organic search. Wired into the Metrics dashboard for tracking pageviews and conversions.",
    delay: 320,
  },
  {
    icon: BarChart3,
    title: "Metrics",
    desc: "Unified cross-module command center. Sparklines, funnels, action items, plus 8am Telegram digest with WoW deltas.",
    delay: 400,
  },
  {
    icon: Package,
    title: "Products",
    desc: "Multi-tenant root. Every signal, lead, draft, and post is scoped to a product so BidForge and OrderForge can join the fleet.",
    delay: 480,
  },
];

const STATS = [
  { label: "Modules", value: "7" },
  { label: "Subreddits", value: "7" },
  { label: "CA Cities", value: "25" },
  { label: "Cron Cadence", value: "24/7" },
];

export function LandingClient() {
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* The global star field is mounted in root layout. */}

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,107,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.025) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Ambient glows */}
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-orange-500/[0.05] blur-[200px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[15%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[160px] pointer-events-none" />
      <div className="fixed top-[55%] left-[8%] w-[500px] h-[500px] rounded-full bg-orange-500/[0.03] blur-[140px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="text-center pt-16 pb-20 space-y-8 animate-fade-in-up">
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-widest"
            style={{
              background: "rgba(255, 107, 0, 0.06)",
              border: "1px solid var(--lf-border-hover)",
              color: "var(--lf-orange)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="lf-dot lf-dot-live" />
            Systems Nominal · v1 Live
          </div>

          {/* Title */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[280px] bg-orange-500/[0.04] rounded-full blur-[140px]" />
            </div>
            <h1
              className="relative text-5xl sm:text-6xl lg:text-[7.5rem] font-black tracking-tighter leading-[0.95] font-mono"
              style={{
                background:
                  "linear-gradient(180deg, #ffffff 0%, #f5f5f5 50%, #999999 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              LaunchForge
            </h1>
            <div
              className="mt-3 text-xs uppercase tracking-[0.4em]"
              style={{ color: "var(--lf-orange)", textShadow: "0 0 12px var(--lf-orange-glow)" }}
            >
              Mission Control for Shipping SaaS
            </div>
          </div>

          <p
            className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--lf-text-dim)" }}
          >
            One operator. Multiple products. Every customer signal, lead, draft, and proof
            post — scoped per product, scored by AI, surfaced when it matters.
          </p>

          <div className="flex items-center justify-center pt-4">
            <SignInButton />
          </div>
        </div>

        {/* Module grid */}
        <div className="mb-6 flex items-center gap-3">
          <Rocket size={14} className="text-primary" />
          <h2 className="text-xs uppercase tracking-widest" style={{ color: "var(--lf-text-dim)" }}>
            7 Modules · One Cockpit
          </h2>
          <div
            className="flex-1 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, var(--lf-orange) 0%, transparent 100%)",
              opacity: 0.4,
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-16">
          {MODULES.map((m) => (
            <div
              key={m.title}
              className="lf-card p-5 animate-fade-in-up"
              style={{ animationDelay: `${m.delay + 600}ms` }}
            >
              <div
                className="mb-3 inline-flex rounded-lg p-2.5"
                style={{
                  background: "rgba(255, 107, 0, 0.08)",
                  border: "1px solid var(--lf-border)",
                }}
              >
                <m.icon size={16} style={{ color: "var(--lf-orange)" }} />
              </div>
              <h3 className="text-sm font-semibold mb-1.5 font-mono">{m.title}</h3>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--lf-text-dim)" }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div
          className="lf-card-static p-6 mb-16 animate-fade-in-up"
          style={{ animationDelay: "1200ms" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="lf-readout text-3xl font-mono">{s.value}</div>
                <div
                  className="text-[10px] uppercase tracking-widest mt-2"
                  style={{ color: "var(--lf-text-dim)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="text-center pb-12 space-y-2 animate-fade-in-up"
          style={{ animationDelay: "1400ms" }}
        >
          <div
            className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
            style={{ color: "var(--lf-text-faint)" }}
          >
            <Layers size={10} />
            <span>Next.js · Prisma · Postgres · Groq · Recharts · Tailwind</span>
          </div>
          <p className="text-[10px]" style={{ color: "var(--lf-text-faint)" }}>
            Built by Adham
          </p>
        </footer>
      </div>
    </div>
  );
}
