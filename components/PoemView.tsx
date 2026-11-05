import { formatDate } from "@/lib/dates";
import type { Poem } from "@/lib/poems";

export function PoemView({ poem }: { poem: Poem }) {
  return (
    <>
      <article className="poem">
        <p className="poem-date">{formatDate(poem.poem_date)}</p>
        <h1>{poem.title}</h1>
        <div className="poem-body">{poem.body}</div>
      </article>
      <section>
        <h2>The plates in this poem</h2>
        <div className="grid">
          {poem.credits.map((c) => (
            <div className="card" key={c.plate_id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/plates/${c.plate_id}/image`} alt={c.plate_text} loading="lazy" />
              <div className="card-body">
                <p>
                  <span className="plate-text">{c.plate_text}</span>
                </p>
                <p>{c.interpretation}</p>
                <p className="muted">
                  Uploaded by <strong>{c.uploader}</strong>
                  {c.region ? ` · ${c.region}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
