import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/store/LeadForms";
import { waMeUrl } from "@/lib/upi";

export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const branches = await db.branch.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { isDefault: "desc" } });
  const wa = tenant.whatsappEnabled && tenant.whatsappNumber ? waMeUrl(tenant.whatsappNumber, "Hi! I have a question.") : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <span className="badge">We&apos;re here to help</span>
      <h1 className="section-title mt-2">Contact {tenant.name}</h1>

      <div className="mt-8 grid lg:grid-cols-[1.1fr_1fr] gap-8">
        <ContactForm shopId={tenant.id} />

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold">Reach us</h3>
            <ul className="mt-3 text-sm space-y-2.5">
              {tenant.phone ? (
                <li><span className="text-muted">Phone:</span> <a className="underline" href={`tel:${tenant.phone}`}>{tenant.phone}</a></li>
              ) : null}
              {tenant.contactEmail ? (
                <li><span className="text-muted">Email:</span> <a className="underline" href={`mailto:${tenant.contactEmail}`}>{tenant.contactEmail}</a></li>
              ) : null}
              {tenant.address ? <li><span className="text-muted">Address:</span> {tenant.address}</li> : null}
              {wa ? (
                <li>
                  <a href={wa} target="_blank" rel="noreferrer" className="btn !min-h-10 mt-1 inline-flex" style={{ background: "#25D366", color: "#0b3d22" }}>
                    Chat on WhatsApp
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="font-bold">Branches</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {branches.map((b) => (
                <li key={b.id}>
                  <div className="font-semibold">{b.name}{b.isDefault ? " · Main" : ""}</div>
                  <div className="text-xs text-muted">{b.address}{b.city ? `, ${b.city}` : ""}</div>
                  <div className="text-xs text-muted">{b.phone} · {b.hours}</div>
                  {b.mapUrl ? <a href={b.mapUrl} target="_blank" rel="noreferrer" className="text-xs underline">Get directions</a> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
