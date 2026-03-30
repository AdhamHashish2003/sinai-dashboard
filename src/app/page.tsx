"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipNav } from "@/components/clip-nav";

const captionStyles = [
  { value: "none", label: "No captions" },
  { value: "word", label: "Word-by-word" },
  { value: "sentence", label: "Sentence" },
  { value: "karaoke", label: "Karaoke highlight" },
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [clipCount, setClipCount] = useState(5);
  const [captionStyle, setCaptionStyle] = useState("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          clip_count: clipCount,
          caption_style: captionStyle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      router.push(`/jobs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ClipNav />
      <main className="flex-1 flex items-center justify-center p-4">
        <form
          onSubmit={handleGenerate}
          className="w-full max-w-xl flex flex-col gap-6"
        >
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Generate Clips
            </h1>
            <p className="text-neutral-500 text-sm">
              Paste a video URL and get viral-ready clips in minutes.
            </p>
          </div>

          {/* URL Input */}
          <input
            type="url"
            required
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-[#111111] border border-[#222222] rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-[#FF6B00] transition-colors text-base"
          />

          {/* Settings row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1.5">
                Clip count
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={clipCount}
                onChange={(e) => setClipCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#111111] border border-[#222222] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1.5">
                Caption style
              </label>
              <select
                value={captionStyle}
                onChange={(e) => setCaptionStyle(e.target.value)}
                className="w-full px-3 py-2 bg-[#111111] border border-[#222222] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6B00] transition-colors appearance-none cursor-pointer"
              >
                {captionStyles.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Generate button */}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3 bg-[#FF6B00] text-black font-semibold rounded-lg hover:bg-[#FF8533] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
          >
            {loading ? "Starting..." : "Generate"}
          </button>
        </form>
      </main>
    </div>
  );
}
