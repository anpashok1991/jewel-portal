import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppointmentForm from "@/components/store/AppointmentForm";

export const metadata: Metadata = { title: "Book an Appointment" };

export default async function AppointmentPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  const branches = await db.branch.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { isDefault: "desc" } });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <span className="badge">Personal shopping</span>
      <h1 className="section-title mt-2">Book an Appointment</h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Reserve a dedicated stylist at your favourite branch — for bridal sets, custom designs, hallmark checks or simply a quieter viewing experience.
      </p>

      <div className="mt-8 grid lg:grid-cols-[1.2fr_1fr] gap-8">
        <AppointmentForm shopId={tenant.id} branches={branches} />

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold">What to expect</h3>
            <ol className="mt-3 text-sm space-y-2.5 text-muted list-decimal list-inside">
              <li>Quick confirmation call from our team</li>
              <li>Reserved seating + refreshments at the branch</li>
              <li>Live rate quote and try-on of shortlisted pieces</li>
              <li>Optional exchange valuation of your old gold</li>
            </ol>
          </div>
          <div className="card p-5">
            <h3 className="font-bold">Our branches</h3>
            <ul className="mt-3 text-sm space-y-3">
              {branches.map((b) => (
                <li key={b.id}>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted">{b.address}{b.city ? `, ${b.city}` : ""}</div>
                  <div className="text-xs text-muted">{b.phone} · {b.hours}</div>
                  {b.mapUrl ? <a className="text-xs underline" href={b.mapUrl} target="_blank" rel="noreferrer">Directions</a> : null}
                </li>
              ))}
            </ul>
          </div>
          {!session ? (
            <p className="text-xs text-muted">Tip: log in first so your appointments show up under your account.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
