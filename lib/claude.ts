import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { PlateLocation, PlateReading, PoemPlate, PoemResult } from "./llm";
import { PLATE_SYSTEM, POEM_SYSTEM, READ_PROMPT, locatePrompt, poemPrompt } from "./prompts";

// Only used when LLM_MODE=claude.
const MODEL = "claude-opus-5-5";
// If the main model declines a request, the API retries it on a suitable fallback model.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

export class ClaudeError extends Error {}

const PlateLocationSchema = z.object({
  found: z.boolean(),
  box: z.object({ x_min: z.number(), y_min: z.number(), x_max: z.number(), y_max: z.number() }),
  plate_text: z.string(),
});

const PlateReadingSchema = z.object({
  legible: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  plate_text: z.string(),
  region: z.string(),
  interpretation: z.string(),
});

const PoemResultSchema = z.object({
  title: z.string(),
  poem: z.string(),
  plate_ids: z.array(z.number().int()),
});

const image = (jpeg: Buffer) =>
  ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } }) as const;

export async function locatePlate(jpeg: Buffer, width: number, height: number): Promise<PlateLocation> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(PlateLocationSchema) },
    system: PLATE_SYSTEM,
    messages: [{ role: "user", content: [image(jpeg), { type: "text", text: locatePrompt(width, height) }] }],
  });
  if (response.stop_reason === "refusal") throw new ClaudeError("Claude declined to read this photo.");
  if (!response.parsed_output) throw new ClaudeError("Claude could not read this photo.");
  return response.parsed_output;
}

export async function readCrop(crop: Buffer): Promise<PlateReading> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(PlateReadingSchema) },
    system: PLATE_SYSTEM,
    messages: [{ role: "user", content: [image(crop), { type: "text", text: READ_PROMPT }] }],
  });
  if (response.stop_reason === "refusal") throw new ClaudeError("Claude declined to read this photo.");
  if (!response.parsed_output) throw new ClaudeError("Claude could not read this photo.");
  return response.parsed_output;
}

export async function writePoem(plates: PoemPlate[]): Promise<PoemResult> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "high", format: betaZodOutputFormat(PoemResultSchema) },
    system: POEM_SYSTEM,
    messages: [{ role: "user", content: poemPrompt(plates) }],
  });
  if (response.stop_reason === "refusal") throw new ClaudeError("Claude declined to write today's poem.");
  if (!response.parsed_output) throw new ClaudeError("Claude did not return a poem.");
  return response.parsed_output;
}
