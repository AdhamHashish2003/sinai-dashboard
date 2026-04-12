"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
  Sun,
  Moon,
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard/products" className="flex items-center gap-2 text-sm font-semibold">
          <Rocket size={18} className="text-primary" />
          <span className="font-mono tracking-tight">LaunchForge</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);

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
                <link.icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {mounted ? (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        ) : (
          <div className="h-[30px] w-[30px]" />
        )}

        {user?.image && (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={28}
            height={28}
            className="rounded-full"
          />
        )}
        <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  );
}
