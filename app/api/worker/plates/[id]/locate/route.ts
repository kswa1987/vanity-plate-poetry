import { PlateLocation } from "@/lib/llm";
import { recordLocation } from "@/lib/plates";
import { hasBearer, unauthorized } from "@/lib/secret";

/** Step 1: the worker says where the plate is; the site crops it and sends the crop back. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasBearer(request, "WORKER_SECRET")) return unauthorized();
  const parsed = PlateLocation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const crop = await recordLocation(Number((await params).id), parsed.data);
  return Response.json(crop ? { status: "cropped", crop_base64: crop.toString("base64") } : { status: "rejected" });
}
