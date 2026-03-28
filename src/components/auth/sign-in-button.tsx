"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export function SignInButton() {
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
