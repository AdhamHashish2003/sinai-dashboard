import { launchFormSchema, paragraphSchema } from "@/types/launch";

describe("launchFormSchema", () => {
  const minimalValid = {
    core: {
      name: "Construction Scrap SF",
      slug: "construction-scrap-sf",
      tagline: "Pickup + recycle",
      icp: "Demo contractors in the Bay Area",
      valueProp: "We pay cash for C&D metal",
      freeTierHook: null,
    },
    radar: {
      targetSubreddits: ["Construction", "sanfrancisco"],
      targetKeywords: ["demolition waste", "scrap metal pickup"],
    },
    scout: {
      scoutState: "CA",
      scoutCities: ["Oakland", "San Jose"],
      scoutQueries: ["demolition contractor"],
    },
    content: {
      contentPostTypes: ["city_report", "fee_comparison"],
      contentTopics: ["SF C&D pricing"],
    },
  };

  it("accepts a minimal valid form", () => {
    expect(launchFormSchema.parse(minimalValid)).toEqual(minimalValid);
  });

  it("rejects slug with uppercase / spaces", () => {
    const bad = { ...minimalValid, core: { ...minimalValid.core, slug: "Bad Slug" } };
    expect(() => launchFormSchema.parse(bad)).toThrow();
  });

  it("rejects scoutState longer than 2 chars", () => {
    const bad = { ...minimalValid, scout: { ...minimalValid.scout, scoutState: "California" } };
    expect(() => launchFormSchema.parse(bad)).toThrow();
  });

  it("rejects empty targetSubreddits array", () => {
    const bad = { ...minimalValid, radar: { ...minimalValid.radar, targetSubreddits: [] } };
    expect(() => launchFormSchema.parse(bad)).toThrow();
  });
});

describe("paragraphSchema", () => {
  it("rejects paragraphs < 30 chars", () => {
    expect(() => paragraphSchema.parse({ paragraph: "too short" })).toThrow();
  });

  it("rejects paragraphs > 2000 chars", () => {
    expect(() => paragraphSchema.parse({ paragraph: "x".repeat(2001) })).toThrow();
  });

  it("accepts a reasonable paragraph", () => {
    const p = "I'm launching Construction Scrap SF, a demolition-debris pickup service for Bay Area GCs.";
    expect(paragraphSchema.parse({ paragraph: p }).paragraph).toBe(p);
  });
});
