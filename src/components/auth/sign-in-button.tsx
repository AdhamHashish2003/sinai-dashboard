"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export function SignInButton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() =>
          signIn("credentials", {
            email: "dev@sinai.local",
            callbackUrl: "/dashboard",
          })
        }
        className="flex items-center gap-2 rounded-lg bg-[#FF6B00] px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#FF8533]"
      >
        Enter Dashboard
      </button>
      <button
        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700/50"
      >
        <Github size={14} />
        Sign in with GitHub
      </button>
    </div>
  );
}
