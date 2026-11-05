import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { listPoems } from "@/lib/poems";

export const dynamic = "force-dynamic";

export default async function PoemsPage() {
  const poems = await listPoems();
  return (
    <>
      <h1>Past poems</h1>
      {poems.length === 0 ? (
        <p>No poems yet.</p>
      ) : (
        <ul>
          {poems.map((p) => (
            <li key={p.id}>
              <Link href={`/poems/${p.id}`}>{p.title}</Link> <span className="muted">· {formatDate(p.poem_date)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
