import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/auth/sign-in-button";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-white">
      <div className="mx-auto max-w-md text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Sinai Dashboard</h1>
          <p className="text-zinc-400">
            Unified SaaS analytics &amp; social media tracking.
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  );
}
