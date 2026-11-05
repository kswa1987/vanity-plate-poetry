import "server-only";
import sharp from "sharp";
import { query } from "./db";
import type { PlateLocation, PlateReading } from "./llm";

export const REJECT = {
  noPlate: "We couldn't find a license plate in this photo. Try a closer, straight-on shot.",
  badCrop: "We couldn't isolate the plate in this photo. Try a closer, straight-on shot.",
  illegible: "The plate couldn't be read clearly. Try a sharper photo with the whole plate in view.",
  disagree: "The plate gave inconsistent readings, so we couldn't be sure of the letters. Try a sharper photo.",
  noMeaning: "We read the plate but couldn't work out what it means.",
} as const;

/** Uppercase letters and digits only, so "L8R G8R" and "L8RG8R" compare equal. */
export const normalizePlate = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, "");

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

async function reject(plateId: number, reason: string): Promise<void> {
  await query("UPDATE plates SET status = 'rejected', reject_reason = $2, read_at = now() WHERE id = $1", [
    plateId,
    reason,
  ]);
}

export async function getPlateImage(plateId: number) {
  const rows = await query<{ image: Buffer }>("SELECT image FROM plates WHERE id = $1 AND status = 'pending'", [
    plateId,
  ]);
  if (!rows[0]) return null;
  const meta = await sharp(rows[0].image).metadata();
  return { image: rows[0].image, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/**
 * Step 1 result: crops the plate out of the photo (with a margin, since AI boxes are rough)
 * and enlarges small crops so the second read has more to work with.
 * Returns the crop, or null if the photo was rejected.
 */
export async function recordLocation(plateId: number, loc: PlateLocation): Promise<Buffer | null> {
  const photo = await getPlateImage(plateId);
  if (!photo) return null;
  if (!loc.found || !normalizePlate(loc.plate_text)) {
    await reject(plateId, REJECT.noPlate);
    return null;
  }

  const { width, height } = photo;
  let { x_min, y_min, x_max, y_max } = loc.box;
  // Some models answer in 0-1 fractions or 0-1000 units instead of pixels.
  const biggest = Math.max(x_min, y_min, x_max, y_max);
  if (biggest > 0 && biggest <= 1) [x_min, x_max, y_min, y_max] = [x_min * width, x_max * width, y_min * height, y_max * height];
  else if (biggest > Math.max(width, height) && biggest <= 1000)
    [x_min, x_max, y_min, y_max] = [(x_min / 1000) * width, (x_max / 1000) * width, (y_min / 1000) * height, (y_max / 1000) * height];

  const boxW = x_max - x_min;
  const boxH = y_max - y_min;
  if (!(boxW >= 8 && boxH >= 4)) {
    await reject(plateId, REJECT.badCrop);
    return null;
  }
  const padX = boxW * 0.2;
  const padY = boxH * 0.35;
  const left = Math.max(0, Math.floor(x_min - padX));
  const top = Math.max(0, Math.floor(y_min - padY));
  const right = Math.min(width, Math.ceil(x_max + padX));
  const bottom = Math.min(height, Math.ceil(y_max + padY));
  if (right - left < 8 || bottom - top < 4) {
    await reject(plateId, REJECT.badCrop);
    return null;
  }

  const crop = await sharp(photo.image)
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize({ width: 800, withoutEnlargement: false, kernel: "lanczos3" })
    .jpeg({ quality: 90 })
    .toBuffer();
  await query("UPDATE plates SET crop = $2, first_read = $3 WHERE id = $1", [plateId, crop, loc.plate_text.trim()]);
  return crop;
}

/**
 * Step 2 result: accepts the plate only if the crop is legible, the two reads agree
 * (one character of slack when the reader is highly confident), and it has a meaning.
 */
export async function recordReading(plateId: number, reading: PlateReading): Promise<{ status: "ready" | "rejected"; reason?: string }> {
  const rows = await query<{ first_read: string | null }>(
    "SELECT first_read FROM plates WHERE id = $1 AND status = 'pending'",
    [plateId],
  );
  if (!rows[0]) return { status: "rejected", reason: "not pending" };

  const first = normalizePlate(rows[0].first_read ?? "");
  const second = normalizePlate(reading.plate_text);
  let reason: string | undefined;
  if (!reading.legible || reading.confidence === "low" || second.length < 2) reason = REJECT.illegible;
  else if (first !== second && !(reading.confidence === "high" && editDistance(first, second) <= 1)) reason = REJECT.disagree;
  else if (reading.interpretation.trim().length < 5) reason = REJECT.noMeaning;

  if (reason) {
    await reject(plateId, reason);
    return { status: "rejected", reason };
  }
  await query(
    `UPDATE plates SET status = 'ready', plate_text = $2, region = $3, interpretation = $4, read_at = now()
      WHERE id = $1`,
    [plateId, reading.plate_text.trim().toUpperCase(), reading.region.trim() || null, reading.interpretation.trim()],
  );
  return { status: "ready" };
}

export type PlateCard = {
  id: number;
  status: "pending" | "ready" | "rejected";
  plate_text: string | null;
  region: string | null;
  interpretation: string | null;
  reject_reason: string | null;
  has_crop: boolean;
  uploader: string;
  created_at: Date;
};

const CARD_COLUMNS = `p.id, p.status, p.plate_text, p.region, p.interpretation, p.reject_reason,
  (p.crop IS NOT NULL) AS has_crop, u.name AS uploader, p.created_at`;

export const listReadyPlates = () =>
  query<PlateCard>(
    `SELECT ${CARD_COLUMNS} FROM plates p JOIN users u ON u.id = p.user_id
      WHERE p.status = 'ready' ORDER BY p.created_at DESC LIMIT 200`,
  );

export const listPlatesByUser = (userId: number) =>
  query<PlateCard>(
    `SELECT ${CARD_COLUMNS} FROM plates p JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [userId],
  );

export const listAllPlates = () =>
  query<PlateCard>(
    `SELECT ${CARD_COLUMNS} FROM plates p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 500`,
  );
