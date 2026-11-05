/** Today's date (YYYY-MM-DD) in the site's time zone. */
export function todayKey(): string {
  const timeZone = process.env.SITE_TIMEZONE || "America/New_York";
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
