"use client";

import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut } from "lucide-react";
import Image from "next/image";

interface NavProps {
  user: { name?: string | null; email?: string | null; image?: string | null } | undefined;
}

export function DashboardNav({ user }: NavProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <LayoutDashboard size={18} className="text-primary" />
        <span>Sinai Dashboard</span>
      </div>

      <div className="flex items-center gap-4">
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
