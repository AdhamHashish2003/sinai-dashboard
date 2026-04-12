import { Search } from "lucide-react";

export default function SeoPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">SEO</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Search engine optimization and keyword tracking. Coming soon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Search size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">SEO module launching soon.</p>
      </div>
    </div>
  );
}
