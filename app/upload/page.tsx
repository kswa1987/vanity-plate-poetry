import { redirect } from "next/navigation";
import { PlateCard } from "@/components/PlateCard";
import { UploadForm } from "@/components/UploadForm";
import { getCurrentUser } from "@/lib/auth";
import { listPlatesByUser } from "@/lib/plates";
import { deleteOwnPlate } from "../actions";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.status !== "approved") {
    return (
      <div className="notice">
        <h1>Thanks for signing up, {user.name}</h1>
        <p>
          {user.status === "pending"
            ? "An admin needs to approve your account before you can upload plates. Check back soon."
            : "Your account wasn't approved for uploading."}
        </p>
      </div>
    );
  }

  const plates = await listPlatesByUser(user.id);
  return (
    <>
      <h1>Upload a plate</h1>
      <p className="muted">Get close and straight-on so the letters are easy to read.</p>
      <UploadForm />
      <section>
        <h2>Your plates</h2>
        {plates.length === 0 ? (
          <p>None yet.</p>
        ) : (
          <div className="grid">
            {plates.map((p) => (
              <PlateCard key={p.id} plate={p} showCrop>
                <form action={deleteOwnPlate}>
                  <input type="hidden" name="plateId" value={p.id} />
                  <button className="small danger">Delete</button>
                </form>
              </PlateCard>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
