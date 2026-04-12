import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groqChat } from "@/lib/groq";
import { fetchSubredditNew, filterLast24h, sleep, type RedditPost } from "@/lib/reddit";

export const maxDuration = 120; // seconds (Railway persistent)

// Cap scope so the button response stays under ~90s
const MAX_SUBREDDITS_PER_RUN = 3;
const POSTS_PER_SUBREDDIT = 15;
const REDDIT_DELAY_MS = 1500;

const SYSTEM_PROMPT_TEMPLATE = `You score social media posts 1-10 for purchase intent for {product_name}.

Product: {value_prop}
ICP: {icp}

Return ONLY valid JSON: {"score": <int 1-10>, "reason": "<one line>"}

Scoring rubric:
10 = user is actively shopping RIGHT NOW for this exact solution
9  = user is comparing tools/vendors in this exact category
8  = user explicitly describes the pain this product solves and is asking for help
7  = user has the problem and is frustrated, open to solutions
6  = user works in the ICP and mentions a related workflow
5  = user discusses the problem space generally
4  = tangentially related industry discussion
3  = vaguely related topic
2  = same industry but irrelevant topic
1  = completely irrelevant`;

/**
 * POST /api/radar/run
 * Body: { productId?: string }
 *
 * Inline radar: scrapes a rotating subset of a product's subreddits, scores
 * each post with Groq (llama-3.3-70b-versatile, JSON mode), dedupes against
 * existing signals, saves score >= 7 to the Signal table.
 *
 * Capped at 3 subreddits × 15 posts = 45 posts per click to stay under ~90s.
 * Click again to sweep more subreddits (rotation is random per invocation).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const productId = body?.productId as string | undefined;

    const products = await db.product.findMany({
      where: productId
        ? { id: productId }
        : { status: { in: ["active", "launched"] } },
      select: {
        id: true,
        name: true,
        slug: true,
        targetSubreddits: true,
        valueProp: true,
        icp: true,
        groqKey: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: "No active products" }, { status: 404 });
    }

    const summary = {
      products: 0,
      scraped: 0,
      scored: 0,
      saved: 0,
      errors: [] as string[],
    };

    for (const product of products) {
      summary.products++;

      // Rotate subreddits randomly so repeated clicks eventually sweep all
      const subs = [...(product.targetSubreddits ?? [])]
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_SUBREDDITS_PER_RUN);

      // ── Scrape ────────────────────────────────────────────────────────────
      const allPosts: RedditPost[] = [];
      for (const sub of subs) {
        const posts = await fetchSubredditNew(sub, POSTS_PER_SUBREDDIT);
        allPosts.push(...filterLast24h(posts));
        await sleep(REDDIT_DELAY_MS);
      }
      summary.scraped += allPosts.length;

      if (allPosts.length === 0) continue;

      // ── Dedup against existing signals ────────────────────────────────────
      const existingUrls = new Set(
        (
          await db.signal.findMany({
            where: { productId: product.id },
            select: { sourceUrl: true },
          })
        ).map((s) => s.sourceUrl)
      );
      const newPosts = allPosts.filter((p) => !existingUrls.has(p.source_url));

      if (newPosts.length === 0) continue;

      // ── Score with Groq ───────────────────────────────────────────────────
      const systemPrompt = SYSTEM_PROMPT_TEMPLATE
        .replace("{product_name}", product.name)
        .replace("{value_prop}", product.valueProp ?? "N/A")
        .replace("{icp}", product.icp ?? "N/A");

      for (const post of newPosts) {
        try {
          const raw = await groqChat(
            [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Title: ${post.title}\n\nBody: ${post.body.slice(0, 2000)}`,
              },
            ],
            {
              maxTokens: 100,
              temperature: 0.2,
              jsonMode: true,
              apiKey: product.groqKey ?? undefined,
            }
          );

          const parsed = safeParseScore(raw);
          if (!parsed) continue;

          summary.scored++;

          if (parsed.score >= 7) {
            try {
              await db.signal.create({
                data: {
                  productId: product.id,
                  source: post.source,
                  sourceUrl: post.source_url,
                  title: post.title,
                  body: post.body.slice(0, 4000),
                  author: post.author,
                  score: parsed.score,
                  reason: parsed.reason,
                  status: "new",
                },
              });
              summary.saved++;
            } catch (err) {
              // P2002 = unique constraint (sourceUrl dedup), safe to skip
              if (err instanceof Error && err.message.includes("P2002")) continue;
              summary.errors.push(`save: ${err instanceof Error ? err.message : "unknown"}`);
            }
          }
        } catch (err) {
          summary.errors.push(
            `score: ${err instanceof Error ? err.message.slice(0, 100) : "unknown"}`
          );
        }
      }
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[radar/run] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

function safeParseScore(raw: string): { score: number; reason: string } | null {
  try {
    let text = raw.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(text) as { score?: unknown; reason?: unknown };
    const score = Number(parsed.score);
    const reason = String(parsed.reason ?? "").slice(0, 400);
    if (!Number.isFinite(score) || score < 1 || score > 10) return null;
    return { score: Math.round(score), reason };
  } catch {
    return null;
  }
}
