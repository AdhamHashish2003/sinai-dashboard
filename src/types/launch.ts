import { z } from "zod";

/**
 * Shapes shared between the Launch Wizard client, /api/launches/ai-fill,
 * and /api/launches. One source of truth.
 */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const stateRegex = /^[A-Z]{2}$/;

export const coreSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(slugRegex, "slug must be lowercase letters/numbers and dashes").max(60),
  tagline: z.string().trim().max(120),
  icp: z.string().trim().min(1).max(400),
  valueProp: z.string().trim().min(1).max(400),
  freeTierHook: z.string().trim().max(200).nullable(),
});

export const radarSchema = z.object({
  targetSubreddits: z.array(z.string().trim().min(1)).min(1).max(10),
  targetKeywords: z.array(z.string().trim().min(1)).min(1).max(10),
});

export const scoutSchema = z.object({
  scoutState: z.string().regex(stateRegex, "must be a 2-letter state code"),
  scoutCities: z.array(z.string().trim().min(1)).min(1).max(10),
  scoutQueries: z.array(z.string().trim().min(1)).min(1).max(10),
});

export const contentSchema = z.object({
  contentPostTypes: z.array(z.string().trim().min(1)).min(1).max(8),
  contentTopics: z.array(z.string().trim().min(1)).min(1).max(10),
});

export const launchFormSchema = z.object({
  core: coreSchema,
  radar: radarSchema,
  scout: scoutSchema,
  content: contentSchema,
});

export const paragraphSchema = z.object({
  paragraph: z.string().trim().min(30).max(2000),
});

export const commitRequestSchema = launchFormSchema.extend({
  seed: z.string().min(1).max(2000),
  model: z.string().min(1).max(80),
});

export type LaunchForm = z.infer<typeof launchFormSchema>;
export type CommitRequest = z.infer<typeof commitRequestSchema>;
