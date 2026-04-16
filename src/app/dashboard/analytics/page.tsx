import Link from "next/link";
import { BarChart3, ExternalLink } from "lucide-react";

type Integration = {
  name: string;
  envVars: string[];
  docsUrl: string;
  unlocks: string[];
};

// Surfacing the missing plumbing honestly beats rendering empty placeholder
// cards that look like broken widgets. Each block below names the env vars
// that flip it on, so the operator can act immediately.
const INTEGRATIONS: Integration[] = [
  {
    name: "Google Analytics 4",
    envVars: ["GA4_PROPERTY_ID", "GOOGLE_SERVICE_ACCOUNT_KEY"],
    docsUrl:
      "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
    unlocks: ["Page views", "Traffic sources", "Conversion funnel"],
  },
  {
    name: "Google Search Console",
    envVars: ["GSC_SITE_URL", "GOOGLE_SERVICE_ACCOUNT_KEY"],
    docsUrl:
      "https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics",
    unlocks: ["Keyword rankings", "Impressions", "CTR by query"],
  },
  {
    name: "Shopify Admin API",
    envVars: ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ACCESS_TOKEN"],
    docsUrl: "https://shopify.dev/docs/api/admin",
    unlocks: ["Sales & revenue", "Top products", "Order-level reporting"],
  },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Page views, traffic sources, and sales — powered by your configured
          integrations.
        </p>
      </div>

      {/* What exists today */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <BarChart3 size={14} className="text-primary" />
          What&apos;s live right now
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>
            <Link href="/dashboard/metrics/saas" className="text-primary hover:underline">
              SaaS metrics
            </Link>{" "}
            — MRR, active users, webhook events, keyword rankings (seeded; connect a
            webhook sender to get live events)
          </li>
          <li>
            <Link href="/dashboard/metrics/instagram" className="text-primary hover:underline">
              Content Farm
            </Link>{" "}
            — social account roll-up (needs RAPIDAPI_KEY for live Instagram data)
          </li>
          <li>
            <Link href="/dashboard/seo" className="text-primary hover:underline">
              SEO
            </Link>{" "}
            — keyword rankings, position change since last snapshot
          </li>
        </ul>
      </div>

      {/* What needs configuration */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-1">Configure to unlock more</h3>
        <p className="text-xs text-muted-foreground">
          Set these env vars in Railway, then redeploy. Each block lights up
          independently.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INTEGRATIONS.map((i) => (
          <div
            key={i.name}
            className="rounded-xl border border-dashed border-border bg-card p-4 flex flex-col"
          >
            <h4 className="text-sm font-semibold mb-2">{i.name}</h4>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Required env
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {i.envVars.map((v) => (
                <code
                  key={v}
                  className="text-[11px] bg-muted/40 px-1.5 py-0.5 rounded font-mono"
                >
                  {v}
                </code>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Unlocks
            </div>
            <ul className="text-xs text-muted-foreground list-disc pl-4 mb-3 flex-1">
              {i.unlocks.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <a
              href={i.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Setup docs <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
