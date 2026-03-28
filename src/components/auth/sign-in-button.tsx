"use client";

import { signIn } from "next-auth/react";
import { Github, Terminal } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

export function SignInButton() {
  if (isDev) {
    return (
      <button
        onClick={() => signIn("credentials", { callbackUrl: "/dashboard" })}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50"
      >
        <Terminal size={14} />
        Dev Login
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      className="flex items-center gap-3 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <Github size={18} />
      Sign in with GitHub
    </button>
  );
}
