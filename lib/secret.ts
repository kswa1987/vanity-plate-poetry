import { timingSafeEqual } from "crypto";

/** Checks an "Authorization: Bearer <secret>" header against an environment variable. */
export function hasBearer(request: Request, envName: "WORKER_SECRET" | "CRON_SECRET"): boolean {
  const expected = process.env[envName];
  const header = request.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
