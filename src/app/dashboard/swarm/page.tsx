import { Bug } from "lucide-react";

export default function SwarmPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Swarm</h2>
        <p className="text-muted-foreground text-sm mt-1">
          AI agent orchestration and task automation. Coming soon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Bug size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Swarm module launching soon.</p>
      </div>
    </div>
  );
}
