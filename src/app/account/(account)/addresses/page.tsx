import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { setDefaultAddress, deleteAddress } from "@/actions/account";
import { AddressForm } from "@/components/account/AddressForm";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const addresses = await db.address.findMany({
    where: { userId: session.uid },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>Addresses</h1>
        <p className="text-sm text-muted">Saved delivery addresses for checkout.</p>
      </div>

      <AddressForm />

      {addresses.length === 0 ? (
        <div className="card p-6 text-center text-muted text-sm">
          No saved addresses yet. Add one above.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {addresses.map((a) => (
            <section key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">
                    {a.name}
                    <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,.06)" }}>{a.label}</span>
                  </p>
                  <p className="text-sm text-muted mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                  <p className="text-sm text-muted">{a.city}, {a.state} — {a.pincode}</p>
                  <p className="text-xs text-muted mt-1">☎ {a.phone}</p>
                </div>
                {a.isDefault ? (
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(21,128,61,.12)", color: "#15803d" }}>Default</span>
                ) : null}
              </div>
              <div className="flex gap-2 mt-3">
                {!a.isDefault ? (
                  <form action={setDefaultAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn btn-ghost !min-h-8 text-xs">Set default</button>
                  </form>
                ) : null}
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn-ghost !min-h-8 text-xs" style={{ color: "#b91c1c" }}>Delete</button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
