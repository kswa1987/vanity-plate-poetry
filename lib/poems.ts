import "server-only";
import { query, transaction } from "./db";
import { writePoem } from "./claude";
import type { PoemPlate, PoemResult } from "./llm";
import { todayKey } from "./dates";

export const MIN_PLATES = 5;
const MAX_CANDIDATES = 25;

export type PoemCredit = {
  plate_id: number;
  plate_text: string;
  region: string | null;
  interpretation: string;
  uploader: string;
};
export type Poem = { id: number; poem_date: string; title: string; body: string; credits: PoemCredit[] };

export type PoemTask =
  | { status: "exists"; poemId: number }
  | { status: "not_enough_plates"; available: number }
  | { status: "needed"; date: string; candidates: PoemPlate[] };

/**
 * Decides whether today's poem still needs writing and, if so, which plates to offer.
 * Plates that have never been in a poem come first; older plates fill in if there are
 * not enough new ones.
 */
export async function getPoemTask(): Promise<PoemTask> {
  const date = todayKey();
  const existing = await query<{ id: number }>("SELECT id FROM poems WHERE poem_date = $1", [date]);
  if (existing[0]) return { status: "exists", poemId: existing[0].id };

  const fresh = await query<PoemPlate>(
    `SELECT id, plate_text, region, interpretation FROM plates p
      WHERE status = 'ready' AND NOT EXISTS (SELECT 1 FROM poem_plates pp WHERE pp.plate_id = p.id)
      ORDER BY created_at DESC LIMIT $1`,
    [MAX_CANDIDATES],
  );
  let candidates = fresh;
  if (candidates.length < MIN_PLATES * 2) {
    const reused = await query<PoemPlate>(
      `SELECT id, plate_text, region, interpretation FROM plates
        WHERE status = 'ready' AND NOT (id = ANY($1::int[])) ORDER BY random() LIMIT $2`,
      [fresh.map((p) => p.id), MIN_PLATES * 2 - fresh.length],
    );
    candidates = [...fresh, ...reused];
  }
  if (candidates.length < MIN_PLATES) return { status: "not_enough_plates", available: candidates.length };
  return { status: "needed", date, candidates };
}

/** Saves a poem for the given date, replacing any poem already there. */
export async function savePoem(date: string, result: PoemResult): Promise<number> {
  const ids = [...new Set(result.plate_ids)];
  const valid = await query<{ id: number }>(
    "SELECT id FROM plates WHERE status = 'ready' AND id = ANY($1::int[])",
    [ids],
  );
  const validIds = new Set(valid.map((r) => r.id));
  const usedIds = ids.filter((id) => validIds.has(id));
  if (usedIds.length < MIN_PLATES) {
    throw new Error(`The poem only used ${usedIds.length} plates; at least ${MIN_PLATES} are required.`);
  }
  return transaction(async (db) => {
    await db.query("DELETE FROM poems WHERE poem_date = $1", [date]);
    const inserted = await db.query<{ id: number }>(
      "INSERT INTO poems (poem_date, title, body) VALUES ($1, $2, $3) RETURNING id",
      [date, result.title.trim(), result.poem.trim()],
    );
    const id = inserted.rows[0].id;
    for (const [position, plateId] of usedIds.entries()) {
      await db.query("INSERT INTO poem_plates (poem_id, plate_id, position) VALUES ($1, $2, $3)", [
        id,
        plateId,
        position,
      ]);
    }
    return id;
  });
}

/** Removes today's poem so it gets written again (by Claude now, or by the PC worker on its next check). */
export async function clearTodaysPoem(): Promise<void> {
  await query("DELETE FROM poems WHERE poem_date = $1", [todayKey()]);
}

/** Claude mode only: writes today's poem right away if it's needed. */
export async function generateWithClaude(): Promise<PoemTask> {
  const task = await getPoemTask();
  if (task.status !== "needed") return task;
  const poemId = await savePoem(task.date, await writePoem(task.candidates));
  return { status: "exists", poemId };
}

async function withCredits(rows: Omit<Poem, "credits">[]): Promise<Poem[]> {
  if (rows.length === 0) return [];
  const credits = await query<PoemCredit & { poem_id: number }>(
    `SELECT pp.poem_id, p.id AS plate_id, p.plate_text, p.region, p.interpretation, u.name AS uploader
       FROM poem_plates pp JOIN plates p ON p.id = pp.plate_id JOIN users u ON u.id = p.user_id
      WHERE pp.poem_id = ANY($1::int[]) ORDER BY pp.position`,
    [rows.map((r) => r.id)],
  );
  return rows.map((r) => ({ ...r, credits: credits.filter((c) => c.poem_id === r.id) }));
}

const POEM_COLUMNS = "id, poem_date::text AS poem_date, title, body";

export async function getLatestPoem(): Promise<Poem | null> {
  const rows = await query<Omit<Poem, "credits">>(
    `SELECT ${POEM_COLUMNS} FROM poems ORDER BY poem_date DESC LIMIT 1`,
  );
  return (await withCredits(rows))[0] ?? null;
}

export async function getPoem(id: number): Promise<Poem | null> {
  const rows = await query<Omit<Poem, "credits">>(`SELECT ${POEM_COLUMNS} FROM poems WHERE id = $1`, [id]);
  return (await withCredits(rows))[0] ?? null;
}

export async function listPoems(): Promise<{ id: number; poem_date: string; title: string }[]> {
  return query(`SELECT id, poem_date::text AS poem_date, title FROM poems ORDER BY poem_date DESC`);
}
