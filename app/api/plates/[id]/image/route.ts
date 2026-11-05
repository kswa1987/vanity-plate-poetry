import { query } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query<{ image: Buffer; image_type: string }>(
    "SELECT image, image_type FROM plates WHERE id = $1",
    [Number(id) || 0],
  );
  if (!rows[0]) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(rows[0].image), {
    headers: { "Content-Type": rows[0].image_type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
