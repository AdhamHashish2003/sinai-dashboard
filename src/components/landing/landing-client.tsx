"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clapperboard,
  Zap,
  Link2,
  GripVertical,
  Layers,
} from "lucide-react";
import { ParticleBackground } from "./particle-background";
import { SignInButton } from "@/components/auth/sign-in-button";

const FEATURES = [
  {
    icon: BarChart3,
    title: "MRR Tracking",
    desc: "Monthly recurring revenue, churn, and active users across all your products.",
    delay: 0,
  },
  {
    icon: TrendingUp,
    title: "Social Growth",
    desc: "Auto-fetch followers, engagement, and posts from Instagram, TikTok, YouTube.",
    delay: 80,
  },
  {
    icon: Clapperboard,
    title: "Content Farm",
    desc: "Every connected account with thumbnails, post history, and growth metrics.",
    delay: 160,
  },
  {
    icon: Zap,
    title: "Live Webhooks",
    desc: "Real-time events from Stripe, Shopify, and custom sources via WebSocket.",
    delay: 240,
  },
  {
    icon: GripVertical,
    title: "Drag & Drop",
    desc: "Rearrange your dashboard widgets into the perfect layout for your workflow.",
    delay: 320,
  },
  {
    icon: Link2,
    title: "SEO Rankings",
    desc: "Track keyword positions, domain authority, and indexed pages over time.",
    delay: 400,
  },
];

const STATS = [
  { label: "Widgets", value: 12 },
  { label: "Platforms", value: 6 },
  { label: "Auto-Refresh (s)", value: 30 },
  { label: "Real-Time WS", value: 1 },
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
    <div className="relative min-h-screen bg-[#060609] text-white overflow-hidden">
      <ParticleBackground />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Ambient glows */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-emerald-500/[0.06] blur-[200px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[20%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-[160px] pointer-events-none" />
      <div className="fixed top-[60%] left-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/[0.03] blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="text-center pt-20 pb-24 space-y-8 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LaunchForge — Live
          </div>

          {/* Title */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[250px] bg-white/[0.03] rounded-full blur-[120px]" />
            </div>
            <h1 className="relative text-6xl sm:text-7xl lg:text-[8rem] font-black tracking-tighter leading-none">
              <span className="bg-gradient-to-b from-white via-white/90 to-zinc-600 bg-clip-text text-transparent">
                LaunchForge
              </span>
            </h1>
          </div>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-md mx-auto leading-relaxed">
            Mission Control for Shipping SaaS
          </p>

          <div className="flex items-center justify-center pt-4">
            <SignInButton />
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.04] hover:-translate-y-0.5 animate-fade-in-up"
              style={{ animationDelay: `${f.delay + 600}ms` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-2.5 transition-colors group-hover:border-emerald-500/20 group-hover:bg-emerald-500/[0.06]">
                  <f.icon size={18} className="text-zinc-400 transition-colors group-hover:text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">{f.title}</h3>
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
                <div className="text-3xl font-bold text-white font-mono">
                  <AnimatedCounter target={s.value} />
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
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
            <Layers size={12} />
            <span>Next.js 14 &middot; Prisma &middot; Postgres &middot; Recharts &middot; Tailwind &middot; Socket.IO</span>
          </div>
          <p className="text-[11px] text-zinc-700">
            Built by Adham
          </p>
        </footer>
      </div>
    </div>
  );
}
