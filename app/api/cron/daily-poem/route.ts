import { llmMode } from "@/lib/llm";
import { generateWithClaude } from "@/lib/poems";
import { hasBearer, unauthorized } from "@/lib/secret";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Vercel calls this once a day (see vercel.json). Only does work when LLM_MODE=claude;
// in local mode the PC worker writes the poem instead.
export async function GET(request: Request) {
  if (!hasBearer(request, "CRON_SECRET")) return unauthorized();
  if (llmMode() !== "claude") return Response.json({ status: "skipped", reason: "local mode" });
  try {
    return Response.json(await generateWithClaude());
  } catch (err) {
    console.error("daily poem failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
