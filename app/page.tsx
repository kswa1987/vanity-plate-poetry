import Link from "next/link";
import { PoemView } from "@/components/PoemView";
import { getLatestPoem } from "@/lib/poems";

export const dynamic = "force-dynamic";

export default async function Home() {
  const poem = await getLatestPoem();
  if (!poem) {
    return (
      <div className="notice">
        <h1>No poem yet</h1>
        <p>
          Once members have shared at least 5 vanity plates, a new poem appears here every day.{" "}
          <Link href="/plates">See the plates so far</Link>.
        </p>
      </div>
    );
  }
  return <PoemView poem={poem} />;
}
