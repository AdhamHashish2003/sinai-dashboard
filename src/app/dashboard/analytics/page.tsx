import { BarChart3, TrendingUp, Globe, ShoppingCart, Target, Package } from "lucide-react";

const PLACEHOLDERS = [
  { icon: BarChart3, title: "Page Views & Visitors", service: "Google Analytics" },
  { icon: TrendingUp, title: "Traffic Sources", service: "Google Analytics" },
  { icon: Globe, title: "SEO Overview", service: "Google Search Console" },
  { icon: ShoppingCart, title: "Sales & Revenue", service: "Shopify" },
  { icon: Target, title: "Conversion Funnel", service: "Google Analytics" },
  { icon: Package, title: "Top Products", service: "Shopify" },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your analytics services to see real data here.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLACEHOLDERS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-dashed border-border bg-card p-6 flex flex-col items-center justify-center text-center h-72"
          >
            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
              <p.icon size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{p.title}</h3>
            <p className="text-xs text-muted-foreground">
              Connect {p.service} to see real data
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
