import { Radar } from "lucide-react";

export default function RadarPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Radar</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Market intelligence and competitor tracking. Coming soon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Radar size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Radar module launching soon.</p>
      </div>
    </div>
  );
}
