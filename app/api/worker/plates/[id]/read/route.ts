import { revalidatePath } from "next/cache";
import { PlateReading } from "@/lib/llm";
import { recordReading } from "@/lib/plates";
import { hasBearer, unauthorized } from "@/lib/secret";

/** Step 2: the worker sends its reading of the cropped plate; the site decides accept or reject. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasBearer(request, "WORKER_SECRET")) return unauthorized();
  const parsed = PlateReading.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const result = await recordReading(Number((await params).id), parsed.data);
  revalidatePath("/plates");
  revalidatePath("/upload");
  return Response.json(result);
}
