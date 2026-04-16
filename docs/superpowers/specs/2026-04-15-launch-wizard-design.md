# Launch Wizard — Design Spec

**Status:** Approved for implementation planning
**Date:** 2026-04-15
**Author:** Adham + Claude (brainstorming skill)

## Summary

Convert Sinai Dashboard from a single-product operator view into a **launchpad**. The first and highest-leverage sub-project is the **Launch Wizard**: a single-page UI that turns a freeform paragraph into a fully configured `Product` row — including Radar (Reddit/HN), Scout (Google Places lead gen), and Content (proof posts) defaults — via one Groq call with an editable preview before commit.

This is "scaffolding only" — no first-run triggers, no Railway infra spin-up. After launch, the existing workers pick up the new product automatically because they already scope by `productId` / `status='active'`.

## Goals

- Paragraph → working product config in ≤ 15 seconds average
- AI fills ≥ 80% of fields meaningfully (user edits ≤ 2 fields in typical case)
- Zero crashes when AI output is malformed (graceful degradation)
- Net-new Prisma fields are strictly additive — existing PermitAI row and Python workers unaffected

## Non-goals (MVP)

- Railway API integration to spin up dedicated cron services per product
- First-run triggers (Radar/Scout auto-runs on launch)
- Conversational / multi-turn wizard
- Launch templates / playbooks (Idea #2 — future)
- Portfolio/dashboard view of multiple launches (Idea #5 — future)
- Module toggle per project (Idea #3 — future)
- Telegram `/launch` command (Idea #7 — future)
- Launch retro/post-mortem (Idea #8 — future)

## User Flow (happy path)

```
1. User clicks "New Launch" from /dashboard/products (or visits /dashboard/launches/new)
2. User pastes a paragraph describing the product, e.g.:
     "I'm launching Construction Scrap SF — I pick up demolition debris
      from GCs in the Bay Area and resell metal to recyclers. Target
      demo contractors with $500-2k jobs."
3. User clicks "Fill with AI" → spinner for ~3s → form fills.
4. User reviews/edits fields across 4 collapsible sections (Core, Radar, Scout, Content).
5. User clicks "Launch" → product row created → redirect to /dashboard/radar?product=<id>.
```

## Architecture

### Schema Changes (Prisma)

Additive migration on the `Product` model:

```prisma
model Product {
  // (existing fields unchanged)

  // Scout defaults
  scoutState       String?
  scoutCities      String[] @default([])
  scoutQueries     String[] @default([])

  // Content defaults
  contentPostTypes String[] @default([])
  contentTopics    String[] @default([])

  // Launch metadata
  // launchedAt: set by wizard commit; null on manually-created Products.
  // Distinguishes "launched via wizard" from legacy/manually-created rows.
  launchedAt       DateTime?
  launchSeed       String?  @db.Text
  launchModel      String?
}
```

**Migration path:** `prisma/migrations/<timestamp>_add_launch_fields/`.
All fields nullable or defaulted → no data backfill needed. Zero risk to existing Python workers (they only read the fields they already use).

**Downstream consumers to update:**
- `src/app/api/scout/run/route.ts` — prefer `product.scoutQueries` / `product.scoutCities` / `product.scoutState` over hardcoded `QUERIES` / `CITIES` constants (fallback to hardcoded for backwards compat).
- `workers/content/main.py` — same fallback pattern for `contentPostTypes` and `contentTopics` (read from Product row via existing `db.py`).

Scout/content workers remain backwards-compatible: new fields are optional and hardcoded defaults kick in when unset.

### API Endpoints

#### `POST /api/launches/ai-fill`
Calls Groq to generate a draft config. Does **not** persist.

Request:
```json
{ "paragraph": "..." }
```

Response (200):
```json
{
  "core": { "name", "slug", "tagline", "icp", "valueProp", "freeTierHook" },
  "radar": { "targetSubreddits": [], "targetKeywords": [] },
  "scout": { "scoutState", "scoutCities": [], "scoutQueries": [] },
  "content": { "contentPostTypes": [], "contentTopics": [] },
  "_meta": { "model": "groq-llama-3.3-70b", "generatedAt": "2026-04-15T..." }
}
```

Errors:
- `400` paragraph < 30 or > 2000 chars
- `502` Groq returned unparseable JSON (auto-retry once before returning this)
- `503` Groq rate-limited (include `retryAfter` seconds from Groq's response)

#### `POST /api/launches`
Creates the Product row using the (possibly user-edited) config.

Request:
```json
{
  "core": {...}, "radar": {...}, "scout": {...}, "content": {...},
  "seed": "original paragraph",
  "model": "groq-llama-3.3-70b"
}
```

Response (201):
```json
{ "id": "cuid...", "slug": "construction-scrap-sf" }
```

Errors:
- `400` Zod validation fails — includes `field` pointing at offender
- `409` slug already exists — suggests `{slug}-2`, `{slug}-3`, etc.

Both endpoints require auth (`getServerSession(authOptions)`), matching the pattern in `src/app/api/radar/run/route.ts`.

### LLM Prompt

Uses the existing `src/lib/groq.ts` helper with `jsonMode: true`, `temperature: 0.3`, `maxTokens: 1200`. Model: `llama-3.3-70b-versatile`.

System prompt emphasizes:
- Output ONLY valid JSON matching the strict schema.
- Never invent facts. If paragraph omits geography, default state to `"CA"`.
- `scoutQueries` must be Google Places-style search strings (e.g., "ADU builder"), not generic terms.
- Subreddit slugs without `r/` prefix.
- Slug must be distinctive (include a qualifying word).

Full prompt lives in `src/app/api/launches/ai-fill/prompt.ts` so it can be unit-tested and updated without touching the route handler.

### Client Component

Single page: `src/app/dashboard/launches/new/page.tsx`.

Structure:
```
LaunchWizardPage (server — auth check only)
  └─ <LaunchWizardClient />  (client component)
       ├─ <ParagraphInput value={paragraph} onChange/>
       ├─ <AIFillButton onClick={callAiFill} loading={aiLoading}/>
       ├─ <ErrorBanner error={aiError}/>
       ├─ <CoreSection    form={form.core}    onChange/>   // collapsible, open by default
       ├─ <RadarSection   form={form.radar}   onChange/>   // collapsible, closed
       ├─ <ScoutSection   form={form.scout}   onChange/>
       ├─ <ContentSection form={form.content} onChange/>
       └─ <LaunchButton   onClick={submit}    disabled={!valid} loading={launchLoading}/>
```

State: `useState<LaunchForm>` with one object holding all sections. Plain React state — `react-hook-form` is overkill for ~15 fields.

Validation: Zod schema in `src/types/launch.ts`, shared between client and both API routes.

Reuses the collapsible `details/summary` styling from the existing Products edit form, and the button/loading pattern from the Connections page.

### Error Handling — full table

| Scenario | Behavior |
|----------|----------|
| Paragraph < 30 chars | "Fill with AI" button disabled client-side |
| Paragraph > 2000 chars | Truncation warning shown client-side |
| Groq 429 / 503 | API proxies retry-after; UI shows "Groq busy — retry in N seconds" |
| Groq returns non-JSON | API auto-retries once with same prompt; if retry fails, returns 502 "AI output malformed, try again" |
| Slug collision at commit | 409 with suggested alternate slugs (`-2`, `-3`); UI pre-fills input |
| User edits to clashing slug | Same 409 path |
| Zod validation fails | 400 with `field` path; UI scrolls to + highlights offending section |
| User closes tab mid-flow | No partial writes. Form state lost (acceptable — localStorage draft is Phase 2) |
| Network drop during commit | Unique slug constraint makes retries idempotent |

## Testing

Proportional to risk:
1. **Unit** — Zod schema fixtures (valid + 3 invalid cases) in `src/__tests__/launch-schema.test.ts`.
2. **Unit** — AI-response parser with 3 fixtures: clean JSON, markdown-fenced JSON, malformed JSON.
3. **Integration** — `POST /api/launches` against a test DB — verifies all fields including `launchSeed` and `launchModel`.
4. **Manual smoke** — 3 paragraphs:
   - Current PermitAI pitch (roundtrip sanity)
   - "Construction Scrap SF" (next real launch)
   - A deliberately vague paragraph (exercises "default to CA" path)

Skipped for MVP: E2E Playwright flow (form-heavy page too brittle this early), load tests (single-operator tool).

## File Manifest

New:
- `prisma/migrations/<ts>_add_launch_fields/migration.sql`
- `src/types/launch.ts` (Zod schema)
- `src/app/api/launches/ai-fill/route.ts`
- `src/app/api/launches/ai-fill/prompt.ts`
- `src/app/api/launches/route.ts`
- `src/app/dashboard/launches/new/page.tsx`
- `src/app/dashboard/launches/new/launch-wizard-client.tsx`
- `src/__tests__/launch-schema.test.ts`
- `src/__tests__/launch-ai-parser.test.ts`

Modified:
- `prisma/schema.prisma` (new Product fields)
- `src/app/api/scout/run/route.ts` (prefer `product.scoutQueries` / `scoutCities`)
- `src/app/dashboard/products/page.tsx` (add "New Launch" CTA linking to wizard)
- `CLAUDE.md` (document the new fields + wizard flow)

Unmodified but worth noting:
- `workers/content/main.py` may eventually read `contentTopics` / `contentPostTypes` — out of scope for this spec, tracked as follow-up.

## Open questions / follow-ups (not in scope)

- **Launch Playbooks** (Idea #2) — reusable templates that inherit to new launches.
- **Module toggle** (Idea #3) — turn Radar OFF for launches that don't use Reddit.
- **Fork a Winner** (Idea #10) — clone PermitAI → "PermitAI Texas" with one click.
- **Launch retro** (Idea #8) — auto-generated markdown when a product is retired.
- **Portfolio view** (Idea #5) — `/launches` table across all products.
- **Telegram `/launch`** (Idea #7) — fire this whole flow from a chat command.

These all build on top of the wizard; they do NOT need to exist for MVP usefulness. The wizard alone will let you launch "Construction Scrap SF" this week.
