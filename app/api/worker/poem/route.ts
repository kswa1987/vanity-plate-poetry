import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PoemResult } from "@/lib/llm";
import { getPoemTask, savePoem } from "@/lib/poems";
import { POEM_SYSTEM, poemPrompt } from "@/lib/prompts";
import { hasBearer, unauthorized } from "@/lib/secret";

export const dynamic = "force-dynamic";

/** The PC worker asks whether today's poem still needs writing, and with which plates. */
export async function GET(request: Request) {
  if (!hasBearer(request, "WORKER_SECRET")) return unauthorized();
  const task = await getPoemTask();
  if (task.status !== "needed") return Response.json({ needed: false, reason: task.status });
  return Response.json({
    needed: true,
    date: task.date,
    system: POEM_SYSTEM,
    prompt: poemPrompt(task.candidates),
  });
}

const Submission = PoemResult.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** The PC worker sends back the finished poem. */
export async function POST(request: Request) {
  if (!hasBearer(request, "WORKER_SECRET")) return unauthorized();
  const parsed = Submission.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  try {
    const poemId = await savePoem(parsed.data.date, parsed.data);
    revalidatePath("/");
    revalidatePath("/poems");
    return Response.json({ poemId });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 422 });
  }
}
