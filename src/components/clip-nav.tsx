"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Generate" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "Dashboard" },
];

export function ClipNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex items-center gap-6 px-6 py-4 border-b border-[#222222]">
      <span className="font-mono text-[#FF6B00] font-bold text-lg tracking-tight">
        clip-engine
      </span>
      <div className="flex gap-4">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                active
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
