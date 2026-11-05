import { notFound } from "next/navigation";
import { PoemView } from "@/components/PoemView";
import { getPoem } from "@/lib/poems";

export const dynamic = "force-dynamic";

export default async function PoemPage({ params }: { params: Promise<{ id: string }> }) {
  const poem = await getPoem(Number((await params).id) || 0);
  if (!poem) notFound();
  return <PoemView poem={poem} />;
}
