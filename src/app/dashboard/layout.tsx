import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="flex min-h-screen flex-col relative">
      <DashboardNav user={session.user} />
      <main className="flex-1 p-6 lf-page-mount">{children}</main>
    </div>
  );
}
