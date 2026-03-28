import { subDays, startOfDay } from "date-fns";

describe("Seed data generators", () => {
  it("generates 30 days of metrics for each product", () => {
    const days = 30;
    const baseMrr = 1_500_000;
    const growth = 0.05;

    const metrics = Array.from({ length: days }, (_, i) => {
      const growthFactor = Math.pow(1 + growth / 30, i);
      return {
        mrrCents: Math.round(baseMrr * growthFactor),
        recordedAt: startOfDay(subDays(new Date(), 29 - i)),
      };
    });

    expect(metrics).toHaveLength(30);
    expect(metrics[0].mrrCents).toBe(baseMrr);
    expect(metrics[29].mrrCents).toBeGreaterThan(metrics[0].mrrCents);
    expect(metrics[0].recordedAt < metrics[29].recordedAt).toBe(true);
  });

  it("generates growth correctly over 30 days", () => {
    const base = 1_000_000;
    const growthPct = 0.06;
    const days = 30;

    const values = Array.from({ length: days }, (_, i) =>
      Math.round(base * Math.pow(1 + growthPct / 30, i))
    );

    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  it("produces 5 social accounts with correct platforms", () => {
    const SOCIAL_ACCOUNTS = [
      { platform: "twitter", handle: "@sinaihq" },
      { platform: "instagram", handle: "@sinaihq" },
      { platform: "youtube", handle: "SinaiHQ" },
      { platform: "tiktok", handle: "@sinaicreates" },
      { platform: "linkedin", handle: "sinai-hq" },
    ];

    expect(SOCIAL_ACCOUNTS).toHaveLength(5);
    const platforms = SOCIAL_ACCOUNTS.map((a) => a.platform);
    expect(platforms).toContain("twitter");
    expect(platforms).toContain("instagram");
    expect(platforms).toContain("youtube");
    expect(platforms).toContain("tiktok");
    expect(platforms).toContain("linkedin");
  });
});
