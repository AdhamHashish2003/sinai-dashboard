"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Zap, Download } from "lucide-react";
import { downloadCsv } from "@/lib/utils";
import type { WebhookEventData } from "@/types/dashboard";

function fetchWebhooks(): Promise<{ events: WebhookEventData[] }> {
  return fetch("/api/dashboard/webhooks").then((r) => r.json());
}

const EVENT_COLORS: Record<string, string> = {
  "subscription.created": "text-emerald-400",
  "subscription.upgraded": "text-blue-400",
  "subscription.cancelled": "text-red-400",
  "payment.succeeded": "text-emerald-400",
  "trial.started": "text-yellow-400",
};

export function WebhooksWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["webhooks"], queryFn: fetchWebhooks, refetchInterval: 10_000 });

  if (isLoading) {
    return <div className="h-56 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-8 rounded bg-muted animate-skeleton" />)}</div>;
  }

  const events = data?.events ?? [];

  function handleExport() {
    downloadCsv(
      "webhook-events.csv",
      ["Event", "Source", "Received At"],
      events.map((e) => [e.event, e.source, e.receivedAt])
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
        <Zap size={20} />
        <p className="text-sm">No events yet. POST to /api/webhooks/saas</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={handleExport} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Download size={10} />CSV
        </button>
      </div>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {events.map((e) => (
          <div key={e.id} className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${EVENT_COLORS[e.event] ?? "text-foreground"}`}>{e.event}</span>
              <p className="text-xs text-muted-foreground truncate">{e.source}</p>
            </div>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {formatDistanceToNow(new Date(e.receivedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
