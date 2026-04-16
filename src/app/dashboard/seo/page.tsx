import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { db } from "@/lib/db";

type Row = {
  keyword: string;
  position: number;
  prevPosition: number;
  change: number;
  url: string;
};

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
        <TrendingUp size={12} />+{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
        <TrendingDown size={12} />
        {change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Minus size={12} />0
    </span>
  );
}

export default async function SeoPage() {
  // Top 20 keywords by position, most recent snapshot per keyword.
  const rankings = await db.keywordRanking.findMany({
    orderBy: { recordedAt: "desc" },
    distinct: ["keyword"],
    take: 30,
  });

  const rows: Row[] = rankings.map((r) => ({
    keyword: r.keyword,
    position: r.position,
    prevPosition: r.prevPosition,
    change: r.prevPosition - r.position,
    url: r.url,
  }));

  const top10Count = rows.filter((r) => r.position <= 10).length;
  const improvingCount = rows.filter((r) => r.change > 0).length;
  const decliningCount = rows.filter((r) => r.change < 0).length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">SEO</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Keyword rankings from Google Search Console. Improvements and drops since
          the last snapshot.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Search size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No keyword rankings yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure <code>GSC_SITE_URL</code> + a service-account key to start
            pulling live data, or seed the <code>KeywordRanking</code> table.
          </p>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Top 10</div>
              <div className="text-2xl font-bold">{top10Count}</div>
              <div className="text-[11px] text-muted-foreground">
                of {rows.length} tracked
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Improving</div>
              <div className="text-2xl font-bold text-emerald-400">
                {improvingCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                moved up since last snapshot
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Declining</div>
              <div className="text-2xl font-bold text-red-400">
                {decliningCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                moved down since last snapshot
              </div>
            </div>
          </div>

          {/* Rankings table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Keyword</th>
                  <th className="px-4 py-2 text-right font-medium w-20">Position</th>
                  <th className="px-4 py-2 text-right font-medium w-20">Change</th>
                  <th className="px-4 py-2 text-left font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.keyword}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">{r.keyword}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      #{r.position}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChangeIndicator change={r.change} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-xs">
                      {r.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
