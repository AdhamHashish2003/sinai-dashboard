"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clapperboard,
  Zap,
  Link2,
  Moon,
  Layers,
} from "lucide-react";
import { ParticleBackground } from "./particle-background";
import { SignInButton } from "@/components/auth/sign-in-button";

const FEATURES = [
  {
    icon: BarChart3,
    title: "SaaS Metrics",
    desc: "MRR, churn, active users — all your products in one view.",
    delay: 0,
  },
  {
    icon: TrendingUp,
    title: "Analytics",
    desc: "Page views, traffic sources, SEO, sales, and conversion funnels.",
    delay: 100,
  },
  {
    icon: Clapperboard,
    title: "Content Farm",
    desc: "Every Instagram and TikTok account with engagement metrics.",
    delay: 200,
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    desc: "WebSocket-powered live data with 30s polling fallback.",
    delay: 300,
  },
  {
    icon: Link2,
    title: "Auto-Linking",
    desc: "Connect any social account or website — data flows automatically.",
    delay: 400,
  },
  {
    icon: Moon,
    title: "Dark Mode",
    desc: "Beautiful dark and light themes with one-click toggle.",
    delay: 500,
  },
];

const STATS = [
  { label: "Widgets", value: 12 },
  { label: "Platforms", value: 6 },
  { label: "Min Auto-Refresh", value: 30 },
  { label: "Real-time WS", value: 1 },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <span>{count}{suffix}</span>;
}

export function LandingClient() {
  return (
    <div className="relative min-h-screen bg-[#080b14] text-white overflow-hidden">
      <ParticleBackground />

      {/* Ambient glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-600/[0.06] blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-600/[0.04] blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="text-center pt-16 pb-20 space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Dashboard v2 — Live
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Sinai
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Your command center for content, analytics, and growth.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <SignInButton />
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] animate-fade-in-up"
              style={{ animationDelay: `${f.delay + 600}ms` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-2">
                  <f.icon size={18} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-6 mb-20 animate-fade-in-up"
          style={{ animationDelay: "1200ms" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-white">
                  <AnimatedCounter
                    target={s.value}
                    suffix={s.label === "Real-time WS" ? "" : ""}
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="text-center pb-12 space-y-3 animate-fade-in-up"
          style={{ animationDelay: "1400ms" }}
        >
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Layers size={12} />
            <span>Next.js 14 &middot; Prisma &middot; Postgres &middot; Recharts &middot; Tailwind &middot; Socket.IO</span>
          </div>
          <p className="text-xs text-zinc-600">
            Built by Adham
          </p>
        </footer>
      </div>
    </div>
  );
}
