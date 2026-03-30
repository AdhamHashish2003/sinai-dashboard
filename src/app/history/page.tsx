"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipNav } from "@/components/clip-nav";

interface Job {
  id: string;
  url: string;
  status: string;
  clip_count: number;
  created_at: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return "text-green-400";
    case "processing":
    case "pending":
      return "text-yellow-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-neutral-500";
  }
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setJobs(Array.isArray(data) ? data : data.jobs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <ClipNav />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold tracking-tight">History</h1>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-[#FF6B00] transition-colors"
          >
            + New job
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-[#111111] border border-[#222222] rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-8 text-center text-neutral-500">
            No jobs yet. Generate your first clips!
          </div>
        ) : (
          <div className="border border-[#222222] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222222] text-neutral-500 text-xs uppercase tracking-wide">
                  <th className="text-left p-3 font-medium">URL</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Clips</th>
                  <th className="text-right p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[#222222] last:border-0 hover:bg-[#111111] transition-colors"
                  >
                    <td className="p-3 max-w-xs truncate">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="hover:text-[#FF6B00] transition-colors"
                      >
                        {job.url}
                      </Link>
                    </td>
                    <td className={`p-3 font-mono ${statusBadge(job.status)}`}>
                      {job.status}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {job.clip_count}
                    </td>
                    <td className="p-3 text-right text-neutral-500 font-mono">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
