import { WidgetGrid } from "@/components/dashboard/widget-grid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Drag widgets to rearrange. Data updates in real-time.
        </p>
      </div>
      <WidgetGrid />
    </div>
  );
}
