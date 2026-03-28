import { WidgetGrid } from "@/components/dashboard/widget-grid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">SaaS Overview</h2>
        <p className="text-muted-foreground text-sm mt-1">
          MRR, users, social growth, and webhooks. Drag widgets to rearrange.
        </p>
      </div>
      <WidgetGrid />
    </div>
  );
}
