import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { togglePlatformUser } from "@/actions/super";
import { PlatformUserForm } from "@/components/super/SuperForms";

export const metadata = { title: "Platform · Users" };
export const dynamic = "force-dynamic";

export default async function SuperUsersPage() {
  const session = await getSession();
  const users = await db.platformUser.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Platform users</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>People with console access (super admins).</p>
      </div>

      <PlatformUserForm />

      <section className="card p-5" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
        <h2 className="font-semibold mb-3">Console access ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase border-b" style={{ color: "var(--c-muted)", borderColor: "rgba(255,255,255,.08)" }}>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Added</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{u.name}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3 text-xs" style={{ color: "var(--c-muted)" }}>{u.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: u.active ? "rgba(74,222,128,.12)" : "rgba(248,113,113,.12)", color: u.active ? "#4ade80" : "#f87171" }}>
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2">
                    {u.id === session?.uid ? (
                      <span className="text-xs" style={{ color: "var(--c-muted)" }}>you</span>
                    ) : (
                      <form action={togglePlatformUser} className="inline">
                        <input type="hidden" name="id" value={u.id} />
                        <button className="text-xs underline">{u.active ? "Disable" : "Enable"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
