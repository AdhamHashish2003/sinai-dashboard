import { z } from "zod";

const payloadSchema = z.object({
  source: z.string().min(1).max(100),
  event: z.string().min(1).max(100),
  data: z.record(z.unknown()).optional().default({}),
});

describe("Webhook payload validation", () => {
  it("accepts valid payload", () => {
    const result = payloadSchema.safeParse({ source: "sinai-insights", event: "subscription.created", data: { amount: 9900 } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("sinai-insights");
      expect(result.data.event).toBe("subscription.created");
    }
  });

  it("defaults data to empty object when not provided", () => {
    const result = payloadSchema.safeParse({ source: "test", event: "trial.started" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.data).toEqual({});
  });

  it("rejects empty source", () => {
    const result = payloadSchema.safeParse({ source: "", event: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects missing event", () => {
    const result = payloadSchema.safeParse({ source: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects source exceeding 100 chars", () => {
    const result = payloadSchema.safeParse({ source: "a".repeat(101), event: "test" });
    expect(result.success).toBe(false);
  });
});
