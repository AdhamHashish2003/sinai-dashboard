import { parseAiResponse, SYSTEM_PROMPT, MODEL_ID } from "@/app/api/launches/ai-fill/prompt";

const VALID_JSON = JSON.stringify({
  core: {
    name: "Construction Scrap SF",
    slug: "construction-scrap-sf",
    tagline: "C&D pickup, cash on the spot",
    icp: "Demolition contractors and GCs in the SF Bay Area",
    valueProp: "We haul scrap metal and pay cash same-day",
    freeTierHook: null,
  },
  radar: {
    targetSubreddits: ["Construction", "sanfrancisco"],
    targetKeywords: ["demolition waste", "scrap metal pickup"],
  },
  scout: {
    scoutState: "CA",
    scoutCities: ["San Francisco", "Oakland"],
    scoutQueries: ["demolition contractor", "general contractor"],
  },
  content: {
    contentPostTypes: ["city_report", "fee_comparison"],
    contentTopics: ["Bay Area C&D metal pricing weekly"],
  },
});

describe("parseAiResponse", () => {
  it("parses clean JSON", () => {
    const parsed = parseAiResponse(VALID_JSON);
    expect(parsed.core.slug).toBe("construction-scrap-sf");
    expect(parsed.scout.scoutState).toBe("CA");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const wrapped = "```json\n" + VALID_JSON + "\n```";
    const parsed = parseAiResponse(wrapped);
    expect(parsed.core.name).toBe("Construction Scrap SF");
  });

  it("parses JSON with a preamble", () => {
    const wrapped = "Here's the config:\n\n" + VALID_JSON;
    const parsed = parseAiResponse(wrapped);
    expect(parsed.radar.targetSubreddits).toContain("Construction");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseAiResponse("not json at all")).toThrow();
  });

  it("throws when schema validation fails", () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_JSON), scout: { scoutState: "California", scoutCities: [], scoutQueries: [] } });
    expect(() => parseAiResponse(bad)).toThrow();
  });
});

describe("prompt metadata", () => {
  it("exports a non-empty system prompt", () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(200);
    expect(SYSTEM_PROMPT).toContain("JSON");
  });

  it("exports a model id", () => {
    expect(MODEL_ID).toMatch(/^groq-/);
  });
});
