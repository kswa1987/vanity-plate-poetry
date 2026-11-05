"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { query } from "@/lib/db";
import {
  checkPassword,
  endSession,
  getCurrentUser,
  hashPassword,
  isAdminEmail,
  requireAdmin,
  startSession,
} from "@/lib/auth";
import { ClaudeError, locatePlate, readCrop } from "@/lib/claude";
import { llmMode } from "@/lib/llm";
import { recordLocation, recordReading } from "@/lib/plates";
import { clearTodaysPoem, generateWithClaude } from "@/lib/poems";

export type FormState = { error?: string; message?: string } | undefined;

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || name.length > 60) return { error: "Please enter a display name (up to 60 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const taken = await query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (taken.length) return { error: "An account with that email already exists. Try logging in." };

  const admin = isAdminEmail(email);
  const rows = await query<{ id: number }>(
    `INSERT INTO users (email, name, password_hash, status, is_admin)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [email, name, await hashPassword(password), admin ? "approved" : "pending", admin],
  );
  await startSession(rows[0].id);
  redirect("/upload");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const rows = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  if (!rows[0] || !(await checkPassword(password, rows[0].password_hash))) {
    return { error: "That email and password don't match." };
  }
  await startSession(rows[0].id);
  redirect("/upload");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function uploadPlate(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in first." };
  if (user.status !== "approved") return { error: "Your account hasn't been approved yet." };

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a photo." };

  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(1568, 1568, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return { error: "That file doesn't look like a photo we can open. Try a JPEG or PNG." };
  }

  const inserted = await query<{ id: number }>(
    "INSERT INTO plates (user_id, image, image_type) VALUES ($1, $2, 'image/jpeg') RETURNING id",
    [user.id, jpeg],
  );
  revalidatePath("/upload");

  if (llmMode() === "local") {
    return { message: "Uploaded. It will be read and interpreted shortly, as long as the site's AI computer is on." };
  }

  try {
    const plateId = inserted[0].id;
    const meta = await sharp(jpeg).metadata();
    const crop = await recordLocation(plateId, await locatePlate(jpeg, meta.width ?? 0, meta.height ?? 0));
    const result = crop ? await recordReading(plateId, await readCrop(crop)) : null;
    revalidatePath("/plates");
    if (!result || result.status === "rejected") {
      const rows = await query<{ reject_reason: string }>("SELECT reject_reason FROM plates WHERE id = $1", [plateId]);
      return { error: rows[0]?.reject_reason ?? "That photo didn't pass the plate check." };
    }
    const plate = await query<{ plate_text: string; interpretation: string }>(
      "SELECT plate_text, interpretation FROM plates WHERE id = $1",
      [plateId],
    );
    return { message: `Got it: ${plate[0].plate_text}. ${plate[0].interpretation}` };
  } catch (err) {
    console.error("plate check failed", err);
    await query("DELETE FROM plates WHERE id = $1", [inserted[0].id]);
    return {
      error: err instanceof ClaudeError ? err.message : "Something went wrong reading the plate. Please try again.",
    };
  }
}

export async function deleteOwnPlate(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await query("DELETE FROM plates WHERE id = $1 AND user_id = $2", [Number(form.get("plateId")), user.id]);
  revalidatePath("/upload");
  revalidatePath("/plates");
}

// ---------- Admin ----------

export async function setUserStatus(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = Number(form.get("userId"));
  const status = String(form.get("status"));
  if (!["approved", "rejected", "pending"].includes(status) || userId === admin.id) return;
  await query("UPDATE users SET status = $1 WHERE id = $2", [status, userId]);
  if (status !== "approved") await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  revalidatePath("/admin");
}

export async function adminDeletePlate(form: FormData): Promise<void> {
  await requireAdmin();
  await query("DELETE FROM plates WHERE id = $1", [Number(form.get("plateId"))]);
  revalidatePath("/admin");
  revalidatePath("/plates");
  revalidatePath("/");
}

export async function adminWritePoem(_prev: FormState, _form: FormData): Promise<FormState> {
  await requireAdmin();
  await clearTodaysPoem();
  revalidatePath("/");
  if (llmMode() === "local") {
    return { message: "Today's poem was cleared. Your PC will write a new one within a few minutes if it's on." };
  }
  try {
    const result = await generateWithClaude();
    if (result.status === "not_enough_plates") {
      return { error: `Need at least 5 read plates to write a poem; there are ${result.available}.` };
    }
  } catch (err) {
    console.error("adminWritePoem failed", err);
    return { error: err instanceof Error ? err.message : "Writing the poem failed." };
  }
  revalidatePath("/");
  revalidatePath("/poems");
  return { message: "Today's poem is written. It's on the home page now." };
}
