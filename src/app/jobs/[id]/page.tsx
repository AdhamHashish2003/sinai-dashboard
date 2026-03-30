"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClipNav } from "@/components/clip-nav";

interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  stage: string;
  progress: number;
  error?: string;
}

interface Clip {
  id: string;
  title: string;
  duration: number;
  score: number;
  video_url: string;
  thumbnail_url?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score > 30) return "text-green-400";
  if (score >= 20) return "text-yellow-400";
  return "text-red-400";
}

function ClipCard({ clip }: { clip: Clip }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-lg overflow-hidden group">
      {/* Video */}
      <div
        className="relative aspect-[9/16] bg-black cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={videoRef}
          src={clip.video_url}
          poster={clip.thumbnail_url}
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-mono rounded">
          {formatDuration(clip.duration)}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-snug line-clamp-2 flex-1">
            {clip.title}
          </h3>
          <span className={`font-mono text-lg font-bold ${scoreColor(clip.score)}`}>
            {clip.score}
          </span>
        </div>
        <a
          href={clip.video_url}
          download
          className="text-xs text-center py-1.5 border border-[#222222] rounded hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors"
        >
          Download
        </a>
      </div>
    </div>
  );
}

export default function JobPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [fetchError, setFetchError] = useState("");

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}/results`);
      if (res.ok) {
        const data = await res.json();
        setClips(data.clips || []);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/jobs/${id}/status`);
        if (!res.ok) {
          setFetchError(`Failed to fetch job status (${res.status})`);
          return;
        }
        const data: JobStatus = await res.json();
        if (cancelled) return;
        setStatus(data);

        if (data.status === "completed") {
          await fetchResults();
          return;
        }
        if (data.status === "failed") return;

        // Keep polling
        setTimeout(poll, 2000);
      } catch {
        if (!cancelled) {
          setTimeout(poll, 2000);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id, fetchResults]);

  const isProcessing =
    status?.status === "pending" || status?.status === "processing";
  const isComplete = status?.status === "completed";
  const isFailed = status?.status === "failed";

  return (
    <div className="min-h-screen flex flex-col">
      <ClipNav />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold tracking-tight">
            Job{" "}
            <span className="font-mono text-neutral-500 text-base">{id}</span>
          </h1>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-[#FF6B00] transition-colors"
          >
            + New job
          </Link>
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="bg-[#111111] border border-red-900 rounded-lg p-4 text-red-400 text-sm">
            {fetchError}
          </div>
        )}

        {/* Progress bar */}
        {isProcessing && status && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base">{status.stage || "Starting..."}</span>
              <span className="font-mono text-sm text-neutral-500">
                {Math.round(status.progress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF6B00] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="bg-[#111111] border border-red-900 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-2">Job failed</p>
            <p className="text-neutral-500 text-sm">
              {status?.error || "An unexpected error occurred."}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 text-sm bg-[#FF6B00] text-black rounded-lg hover:bg-[#FF8533] transition-colors"
            >
              Try again
            </Link>
          </div>
        )}

        {/* Clip grid */}
        {isComplete && clips.length > 0 && (
          <>
            <p className="text-neutral-500 text-sm mb-4">
              {clips.length} clip{clips.length !== 1 ? "s" : ""} generated
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </>
        )}

        {isComplete && clips.length === 0 && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 text-center text-neutral-500">
            Job completed but no clips were generated.
          </div>
        )}

        {/* Loading skeleton while we haven't gotten first status */}
        {!status && !fetchError && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-[#222222] rounded w-48 mb-3" />
            <div className="h-2 bg-[#222222] rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
}
