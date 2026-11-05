import sharp from "sharp";
import { query } from "@/lib/db";
import { PLATE_SYSTEM, READ_PROMPT, locatePrompt } from "@/lib/prompts";
import { hasBearer, unauthorized } from "@/lib/secret";

export const dynamic = "force-dynamic";

/** The PC worker asks for photos that haven't been checked yet. */
export async function GET(request: Request) {
  if (!hasBearer(request, "WORKER_SECRET")) return unauthorized();
  const rows = await query<{ id: number; image: Buffer }>(
    "SELECT id, image FROM plates WHERE status = 'pending' ORDER BY created_at LIMIT 3",
  );
  const plates = await Promise.all(
    rows.map(async (r) => {
      const meta = await sharp(r.image).metadata();
      return {
        id: r.id,
        image_base64: r.image.toString("base64"),
        locate_prompt: locatePrompt(meta.width ?? 0, meta.height ?? 0),
      };
    }),
  );
  return Response.json({ system: PLATE_SYSTEM, read_prompt: READ_PROMPT, plates });
}
