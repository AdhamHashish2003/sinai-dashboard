"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Package,
  Radar,
  Bug,
  Users,
  FileText,
  Search,
  BarChart3,
  LogOut,
  Rocket,
} from "lucide-react";
import Image from "next/image";

interface NavProps {
  user: { name?: string | null; email?: string | null; image?: string | null } | undefined;
}

const NAV_LINKS = [
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/radar", label: "Radar", icon: Radar },
  { href: "/dashboard/swarm", label: "Swarm", icon: Bug },
  { href: "/dashboard/crm", label: "CRM", icon: Users },
  { href: "/dashboard/content", label: "Content", icon: FileText },
  { href: "/dashboard/seo", label: "SEO", icon: Search },
  { href: "/dashboard/metrics", label: "Metrics", icon: BarChart3 },
];

export function DashboardNav({ user }: NavProps) {
  const pathname = usePathname() ?? "";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header
      className="relative px-6 py-3 flex items-center justify-between"
      style={{
        background: "rgba(6, 6, 8, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--lf-border)",
      }}
    >
      {/* top orange scan line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--lf-orange) 50%, transparent 100%)",
          opacity: 0.6,
        }}
      />

      <div className="flex items-center gap-6">
        <Link
          href="/dashboard/metrics"
          className="flex items-center gap-2 text-sm font-semibold group"
        >
          <Rocket
            size={18}
            className="text-primary transition-transform group-hover:rotate-12"
            style={{ filter: "drop-shadow(0 0 6px var(--lf-orange-glow))" }}
          />
          <span
            className="font-mono tracking-tight"
            style={{ textShadow: "0 0 10px var(--lf-orange-glow-soft)" }}
          >
            LaunchForge
          </span>
          <span className="lf-dot lf-dot-live ml-1" title="Systems nominal" />
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`lf-nav-tab flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? "lf-nav-tab-active" : ""
                }`}
              >
                <link.icon size={12} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user?.image && (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={26}
            height={26}
            className="rounded-full ring-1 ring-orange-500/30"
          />
        )}
        {mounted && user?.name && (
          <span
            className="text-[10px] uppercase tracking-wider hidden sm:block"
            style={{ color: "var(--lf-text-dim)" }}
          >
            {user.name}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1 text-[10px] uppercase tracking-wider transition-colors"
          style={{ color: "var(--lf-text-dim)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--lf-orange)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--lf-text-dim)")}
        >
          <LogOut size={12} />
          Eject
        </button>
      </div>
    </header>
  );
}
