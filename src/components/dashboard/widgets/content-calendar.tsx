"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, FileText } from "lucide-react";
import type { ContentPostData } from "@/types/dashboard";

function fetchCalendar(): Promise<{ posts: ContentPostData[] }> {
  return fetch("/api/dashboard/calendar").then((r) => r.json());
}

const STATUS_ICONS = {
  published: <CheckCircle size={11} className="text-emerald-400" />,
  scheduled: <Clock size={11} className="text-yellow-400" />,
  draft: <FileText size={11} className="text-muted-foreground" />,
};

const PLATFORM_EMOJI: Record<string, string> = {
  twitter: "𝕏",
  instagram: "📸",
  youtube: "▶️",
  tiktok: "🎵",
  linkedin: "💼",
};

export function ContentCalendarWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["calendar"], queryFn: fetchCalendar, refetchInterval: 60_000 });

  if (isLoading) {
    return <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  const posts = data?.posts ?? [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
        <Calendar size={20} />
        <p className="text-sm">No upcoming posts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-56 overflow-y-auto">
      {posts.map((p) => (
        <div key={p.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
          <span className="text-base mt-0.5 flex-shrink-0">{PLATFORM_EMOJI[p.platform] ?? "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.handle}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              {STATUS_ICONS[p.status as keyof typeof STATUS_ICONS]}
              <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
            </div>
            {p.scheduledAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(p.scheduledAt), "MMM d")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
