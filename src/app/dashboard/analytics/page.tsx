import { AnalyticsWidgetGrid } from "@/components/dashboard/analytics-widget-grid";

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Page views, traffic sources, SEO metrics, sales, and conversions.
        </p>
      </div>
      <AnalyticsWidgetGrid />
    </div>
  );
}
