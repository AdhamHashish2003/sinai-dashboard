import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { groqChat, cleanLlmOutput } from "@/lib/groq";

export const maxDuration = 120;

type PostType = "city_report" | "fee_comparison" | "adu_case_study";

interface CityEntry {
  id: string;
  name: string;
  state: string;
  population: number;
}

// Top 25 CA metros — mirrors workers/content/product_configs/permit-ai.yml
// so manual generation uses the same weighted city pool as the daily cron.
const PERMITAI_CITIES: CityEntry[] = [
  { id: "los_angeles_ca", name: "Los Angeles", state: "CA", population: 3898747 },
  { id: "san_diego_ca", name: "San Diego", state: "CA", population: 1386932 },
  { id: "san_jose_ca", name: "San Jose", state: "CA", population: 1013240 },
  { id: "san_francisco_ca", name: "San Francisco", state: "CA", population: 873965 },
  { id: "fresno_ca", name: "Fresno", state: "CA", population: 542107 },
  { id: "sacramento_ca", name: "Sacramento", state: "CA", population: 524943 },
  { id: "long_beach_ca", name: "Long Beach", state: "CA", population: 466742 },
  { id: "oakland_ca", name: "Oakland", state: "CA", population: 440646 },
  { id: "bakersfield_ca", name: "Bakersfield", state: "CA", population: 403455 },
  { id: "anaheim_ca", name: "Anaheim", state: "CA", population: 346824 },
  { id: "santa_ana_ca", name: "Santa Ana", state: "CA", population: 310227 },
  { id: "riverside_ca", name: "Riverside", state: "CA", population: 314998 },
  { id: "stockton_ca", name: "Stockton", state: "CA", population: 320804 },
  { id: "irvine_ca", name: "Irvine", state: "CA", population: 307670 },
  { id: "chula_vista_ca", name: "Chula Vista", state: "CA", population: 275487 },
  { id: "fremont_ca", name: "Fremont", state: "CA", population: 230504 },
  { id: "san_bernardino_ca", name: "San Bernardino", state: "CA", population: 222101 },
  { id: "modesto_ca", name: "Modesto", state: "CA", population: 218464 },
  { id: "oxnard_ca", name: "Oxnard", state: "CA", population: 202063 },
  { id: "fontana_ca", name: "Fontana", state: "CA", population: 208393 },
  { id: "glendale_ca", name: "Glendale", state: "CA", population: 196543 },
  { id: "huntington_beach_ca", name: "Huntington Beach", state: "CA", population: 198711 },
  { id: "santa_clarita_ca", name: "Santa Clarita", state: "CA", population: 228673 },
  { id: "pasadena_ca", name: "Pasadena", state: "CA", population: 138699 },
  { id: "berkeley_ca", name: "Berkeley", state: "CA", population: 124321 },
];

const TARGET_PLATFORMS = ["reddit", "linkedin", "biggerpockets"];

const PROMPT_TEMPLATES: Record<PostType, string> = {
  city_report: `You are writing a Reddit/LinkedIn-ready "proof post" for {product_name}, a product that {value_prop}.

The post is about permit timelines and building requirements for: **{city_name}, {state}**.

PRODUCT CONTEXT
- Product: {product_name}
- Value prop: {value_prop}
- ICP: {icp}
- Product URL: {prod_url}

POST GOAL
Give contractors, ADU builders, and homeowners useful information about permit timelines and common snags in {city_name}. The post is "proof" that {product_name} has real knowledge of this city's permitting process.

HARD RULES
- Max 300 words. 150-220 is the sweet spot.
- Start with a concrete insight, NOT validation.
- No corporate speak: no "leverage", "synergy", "streamline", "holistic".
- No emojis, no em-dashes.
- Mention {product_name} EXACTLY ONCE near the end.
- Include 3-5 concrete data points (timelines, forms, fee ranges, department names).
- End with one useful takeaway the reader can act on TODAY.

Return ONLY the post body text.`,

  fee_comparison: `You are writing a Reddit/LinkedIn fee comparison post for {product_name}.

The comparison: **{cities_list}** (all {state}).

PRODUCT CONTEXT
- Product: {product_name}
- Value prop: {value_prop}
- ICP: {icp}

POST GOAL
Show how permit fees vary between nearby cities for the same project type. Contractors LOVE concrete fee numbers.

HARD RULES
- Max 280 words.
- Start with the single most surprising finding.
- Use a simple markdown table OR 3-4 line bullet list.
- Include approximate fee numbers (plan check, permit, school district, impact).
- Mention {product_name} EXACTLY ONCE near the end.
- No emojis, no corporate speak.

Return ONLY the post body text.`,

  adu_case_study: `You are writing a Reddit/BiggerPockets ADU case study for {product_name}.

The scenario: end-to-end ADU project in **{city_name}, {state}**.

PRODUCT CONTEXT
- Product: {product_name}
- Value prop: {value_prop}
- ICP: {icp}

POST GOAL
Tell a plausible story of an ADU project going from "I want to build" to "permit in hand" in {city_name}.

HARD RULES
- Max 350 words.
- Use a realistic scenario (lot size, ADU size, detached vs attached).
- Walk through phases: feasibility → zoning → plan prep → plan check → corrections → permit.
- Include rough timeline (weeks) and costs.
- Name actual city departments (Planning, Building & Safety).
- Flag 2-3 gotchas.
- Mention {product_name} EXACTLY ONCE.

Return ONLY the post body text.`,
};

/**
 * POST /api/content/run
 * Body: { productId: string, postType?: PostType }
 *
 * Real generation (replaces the old placeholder):
 * 1. Validate product + post type
 * 2. Pick a city weighted by log(population), excluding cities used in last 30d
 * 3. Call Groq llama-3.3-70b-versatile with the matching prompt template
 * 4. Save ProofPost with the generated body
 * 5. Push Telegram if chatId is set
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const productId = body?.productId as string | undefined;
    const postType = (body?.postType ?? "city_report") as PostType;

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }
    if (!["city_report", "fee_comparison", "adu_case_study"].includes(postType)) {
      return NextResponse.json({ error: "invalid postType" }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // ── Pick topic ────────────────────────────────────────────────────────
    const recentTopics = await db.proofPost.findMany({
      where: {
        productId: product.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { topic: true },
    });
    const excluded = new Set(recentTopics.map((p) => p.topic));

    let topicName: string;
    let cityName = "";
    let citiesList = "";

    if (postType === "fee_comparison") {
      const picks = pickComparisonCities(PERMITAI_CITIES, 3);
      topicName = picks.map((c) => c.name).join(" vs ");
      citiesList = picks.map((c) => c.name).join(", ");
    } else {
      const eligible = PERMITAI_CITIES.filter((c) => !excluded.has(c.name));
      const pool = eligible.length > 0 ? eligible : PERMITAI_CITIES;
      const city = pickWeightedCity(pool);
      topicName = city.name;
      cityName = city.name;
    }

    // ── Build prompt ──────────────────────────────────────────────────────
    const systemPrompt = PROMPT_TEMPLATES[postType]
      .replace(/{product_name}/g, product.name)
      .replace(/{value_prop}/g, product.valueProp ?? "AI-powered analysis")
      .replace(/{icp}/g, product.icp ?? "")
      .replace(/{prod_url}/g, product.prodUrl ?? "")
      .replace(/{city_name}/g, cityName)
      .replace(/{state}/g, "CA")
      .replace(/{cities_list}/g, citiesList);

    // ── Generate ──────────────────────────────────────────────────────────
    let generatedBody: string;
    try {
      const raw = await groqChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate the ${postType} proof post now. Output ONLY the post body text.`,
          },
        ],
        {
          maxTokens: 800,
          temperature: 0.7,
          apiKey: product.groqKey ?? undefined,
        }
      );
      generatedBody = cleanLlmOutput(raw);
    } catch (err) {
      // Save as failed so it shows up in the UI with the error
      const failedPost = await db.proofPost.create({
        data: {
          productId: product.id,
          postType,
          topic: topicName,
          generatedBody: "",
          generatedAssets: [],
          targetPlatforms: TARGET_PLATFORMS,
          status: "failed",
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        },
      });
      return NextResponse.json(
        { error: "Generation failed", detail: err instanceof Error ? err.message : "unknown", postId: failedPost.id },
        { status: 502 }
      );
    }

    // ── Save ──────────────────────────────────────────────────────────────
    const post = await db.proofPost.create({
      data: {
        productId: product.id,
        postType,
        topic: topicName,
        generatedBody,
        generatedAssets: [],
        targetPlatforms: TARGET_PLATFORMS,
        draftVersions: [{ body: generatedBody }],
        status: "draft",
      },
    });

    // ── Telegram push ─────────────────────────────────────────────────────
    let telegramSent = false;
    const chatId = product.telegramChatId;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (chatId && token) {
      const msg =
        `📝 *New ${product.name} proof post*\n` +
        `Type: ${postType}\n` +
        `Topic: ${topicName}\n\n` +
        `*Draft:*\n${generatedBody}\n\n` +
        `_Open /dashboard/content to review_`;
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg.length > 4000 ? msg.slice(0, 3990) + "\n…" : msg,
            parse_mode: "Markdown",
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (tgRes.ok) telegramSent = true;
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      topic: topicName,
      postType,
      charCount: generatedBody.length,
      telegramSent,
    });
  } catch (err) {
    console.error("[content/run] error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

function pickWeightedCity(cities: CityEntry[]): CityEntry {
  const weights = cities.map((c) => Math.max(1, Math.log10(Math.max(c.population, 1))));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cities.length; i++) {
    r -= weights[i];
    if (r <= 0) return cities[i];
  }
  return cities[cities.length - 1];
}

function pickComparisonCities(cities: CityEntry[], n: number): CityEntry[] {
  const pool = [...cities];
  const picks: CityEntry[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const weights = pool.map((c) => Math.max(1, Math.log10(Math.max(c.population, 1))));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picks;
}
