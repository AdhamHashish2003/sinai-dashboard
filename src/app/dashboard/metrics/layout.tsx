"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Clapperboard, Link2 } from "lucide-react";

const METRICS_LINKS = [
  { href: "/dashboard/metrics", label: "SaaS Overview", icon: LayoutDashboard },
  { href: "/dashboard/metrics/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/metrics/content-farm", label: "Content Farm", icon: Clapperboard },
  { href: "/dashboard/metrics/connections", label: "Connections", icon: Link2 },
];

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div>
      <nav className="flex items-center gap-1 mb-6 pb-3 border-b border-border overflow-x-auto">
        {METRICS_LINKS.map((link) => {
          const isActive =
            link.href === "/dashboard/metrics"
              ? pathname === "/dashboard/metrics"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <link.icon size={13} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
