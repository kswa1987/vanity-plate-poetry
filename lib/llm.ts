import { z } from "zod";

/**
 * "local" (default): the AI runs on the owner's PC. The worker program polls this site,
 * reads pending plates and writes the daily poem.
 * "claude": the site calls the Claude API directly.
 */
export const llmMode = (): "local" | "claude" => (process.env.LLM_MODE === "claude" ? "claude" : "local");

/** Step 1: find the plate in the full photo and take a first read. */
export const PlateLocation = z.object({
  found: z.boolean(),
  box: z.object({ x_min: z.number(), y_min: z.number(), x_max: z.number(), y_max: z.number() }),
  plate_text: z.string().max(40),
});
export type PlateLocation = z.infer<typeof PlateLocation>;

/** Step 2: read the cropped plate on its own and interpret it. */
export const PlateReading = z.object({
  legible: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  plate_text: z.string().max(40),
  region: z.string().max(80),
  interpretation: z.string().max(1000),
});
export type PlateReading = z.infer<typeof PlateReading>;

export const PoemResult = z.object({
  title: z.string().min(1).max(200),
  poem: z.string().min(1).max(10000),
  plate_ids: z.array(z.number().int()),
});
export type PoemResult = z.infer<typeof PoemResult>;

export type PoemPlate = { id: number; plate_text: string; region: string | null; interpretation: string };
