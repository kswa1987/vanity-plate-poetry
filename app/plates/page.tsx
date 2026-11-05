import { PlateCard } from "@/components/PlateCard";
import { listReadyPlates } from "@/lib/plates";

export const dynamic = "force-dynamic";

export default async function PlatesPage() {
  const plates = await listReadyPlates();
  return (
    <>
      <h1>Plates</h1>
      {plates.length === 0 ? (
        <p>No plates yet.</p>
      ) : (
        <div className="grid">
          {plates.map((p) => (
            <PlateCard key={p.id} plate={p} />
          ))}
        </div>
      )}
    </>
  );
}
