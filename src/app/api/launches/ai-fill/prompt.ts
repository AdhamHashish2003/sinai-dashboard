import { launchFormSchema, type LaunchForm } from "@/types/launch";
import { cleanLlmOutput } from "@/lib/groq";

export const MODEL_ID = "groq-llama-3.3-70b";

export const SYSTEM_PROMPT = `You are a launch-planning assistant. Given a short paragraph describing a business or product a founder wants to launch, you return a JSON object that configures a multi-module operator dashboard.

Your output MUST be valid JSON matching this schema:
{
  "core": {
    "name":            string,  // short, titlecase, no trademark
    "slug":            string,  // lowercase-with-dashes, url-safe, must include a distinguishing word
    "tagline":         string,  // <= 8 words, punchy
    "icp":             string,  // 1-2 sentences, who buys this
    "valueProp":       string,  // 1-2 sentences, why they buy
    "freeTierHook":    string | null  // null if no obvious hook
  },
  "radar": {
    "targetSubreddits": string[],  // 3-8 subreddit slugs WITHOUT "r/" prefix
    "targetKeywords":   string[]   // 3-8 short phrases, 2-4 words each
  },
  "scout": {
    "scoutState":   string,   // 2-letter US state code
    "scoutCities":  string[], // 3-6 major cities in that state
    "scoutQueries": string[]  // 2-5 Google Maps search queries for lead gen
  },
  "content": {
    "contentPostTypes": string[],  // 2-4 of: city_report, fee_comparison, case_study, comparison, how_to, vendor_list
    "contentTopics":    string[]   // 3-6 specific topic starters
  }
}

Rules:
- Never invent facts. If the paragraph doesn't mention geography, default scoutState to "CA".
- slug must be distinctive: incorporate a qualifying word (e.g. "permit-ai" not just "permit").
- Subreddits: only include subreddits that plausibly exist. Common patterns: /r/<industry>, /r/<location>, /r/smallbusiness, /r/Entrepreneur. Do NOT include "r/" prefix.
- scoutQueries are Google Places-style search strings like "ADU builder", "demolition contractor" — NOT generic terms like "business".
- Output ONLY the JSON object. No prose, no markdown fences, no commentary.`;

/**
 * Parse the LLM response into a validated LaunchForm. Strips markdown fences,
 * strips common preambles, then validates against the shared Zod schema.
 * Throws if the JSON is malformed OR the schema is violated.
 */
export function parseAiResponse(raw: string): LaunchForm {
  const cleaned = cleanLlmOutput(raw);

  // cleanLlmOutput handles most wrappers, but the LLM sometimes prepends
  // explanatory text before the first `{`. Slice from the first { to the last }.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("AI response contains no JSON object");
  }
  const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (err) {
    throw new Error(`AI response JSON.parse failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  // launchFormSchema.parse throws a ZodError on failure — callers can inspect it.
  return launchFormSchema.parse(parsed);
}
