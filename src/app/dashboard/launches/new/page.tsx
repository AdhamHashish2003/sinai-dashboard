import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LaunchWizardClient } from "./launch-wizard-client";

export default async function LaunchWizardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Launch</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe what you&apos;re launching. I&apos;ll fill the config — edit anything that&apos;s off, then commit.
        </p>
      </div>
      <LaunchWizardClient />
    </div>
  );
}
