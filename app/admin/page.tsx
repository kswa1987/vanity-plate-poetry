import { PlateCard } from "@/components/PlateCard";
import { WritePoemButton } from "@/components/WritePoemButton";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { llmMode } from "@/lib/llm";
import { listAllPlates } from "@/lib/plates";
import { adminDeletePlate, setUserStatus } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Row = { id: number; name: string; email: string; status: string; is_admin: boolean; created_at: Date };

function StatusButton({ userId, status, label }: { userId: number; status: string; label: string }) {
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <button className={status === "rejected" ? "small danger" : "small"}>{label}</button>
    </form>
  );
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = await query<Row>(
    "SELECT id, name, email, status, is_admin, created_at FROM users ORDER BY status = 'pending' DESC, created_at DESC",
  );
  const plates = await listAllPlates();
  const pending = users.filter((u) => u.status === "pending");
  const waiting = plates.filter((p) => p.status === "pending").length;

  return (
    <>
      <h1>Admin</h1>

      <section>
        <h2>Waiting for approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <p>Nobody is waiting.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <StatusButton userId={u.id} status="approved" label="Approve" />
                      <StatusButton userId={u.id} status="rejected" label="Reject" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Today&apos;s poem</h2>
        <p className="muted">
          {llmMode() === "local"
            ? `The AI runs on your PC. ${waiting} plate photo(s) are waiting to be read. The PC writes a poem once a day when at least 5 plates are ready.`
            : "Claude writes the poem automatically each day."}
        </p>
        <WritePoemButton />
      </section>

      <section>
        <h2>All members</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    {u.is_admin ? " (admin)" : ""}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td>
                    {u.id !== admin.id && u.status !== "approved" && (
                      <StatusButton userId={u.id} status="approved" label="Approve" />
                    )}
                    {u.id !== admin.id && u.status === "approved" && (
                      <StatusButton userId={u.id} status="rejected" label="Remove access" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>All plates ({plates.length})</h2>
        <div className="grid">
          {plates.map((p) => (
            <PlateCard key={p.id} plate={p} showCrop>
              <form action={adminDeletePlate}>
                <input type="hidden" name="plateId" value={p.id} />
                <button className="small danger">Delete</button>
              </form>
            </PlateCard>
          ))}
        </div>
      </section>
    </>
  );
}
