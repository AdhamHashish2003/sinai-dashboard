import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import {
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  LayoutGrid,
  Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "MRR Tracking",
    desc: "Real-time revenue metrics across all your SaaS products.",
  },
  {
    icon: TrendingUp,
    title: "Social Growth",
    desc: "Follower growth and engagement across every platform.",
  },
  {
    icon: Users,
    title: "Active Users",
    desc: "Track daily active users with trend analysis.",
  },
  {
    icon: Zap,
    title: "Live Webhooks",
    desc: "Instant event stream from Stripe, Paddle, and more.",
  },
  {
    icon: LayoutGrid,
    title: "Drag & Drop",
    desc: "Rearrange your dashboard widgets however you like.",
  },
  {
    icon: Globe,
    title: "SEO Rankings",
    desc: "Keyword position tracking with change indicators.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-3xl text-center px-6 py-16 space-y-12">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-800/50 px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Phase 1 — Live
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Sinai Dashboard
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto leading-relaxed">
            Your unified command center for SaaS metrics and social media analytics.
          </p>
        </div>

        {/* CTA */}
        <SignInButton />

        {/* Feature grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-left backdrop-blur-sm transition-colors hover:border-zinc-700 hover:bg-zinc-800/40"
            >
              <f.icon
                size={18}
                className="text-indigo-400 mb-2 transition-transform group-hover:scale-110"
              />
              <h3 className="text-sm font-semibold text-zinc-200">{f.title}</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-600 pt-4">
          Built with Next.js 14, Prisma, and Recharts
        </p>
      </div>
    </div>
  );
}
