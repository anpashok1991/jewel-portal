import Link from "next/link";
import type { Tenant } from "@/lib/tenant";

export default function Footer({ tenant, whatsappLink }: { tenant: Tenant; whatsappLink: string }) {
  return (
    <footer className="mt-16 border-t" style={{ background: "var(--c-surface)", borderColor: "color-mix(in srgb, var(--c-muted) 30%, transparent)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="font-theme-display text-lg font-bold mb-2">{tenant.name}</div>
          <p className="text-muted leading-relaxed">{tenant.tagline || "Hallmarked jewellery, crafted with trust."}</p>
          <p className="mt-3 whitespace-pre-line text-muted">{tenant.address}</p>
        </div>
        <div>
          <div className="font-semibold mb-3">Shop</div>
          <ul className="space-y-2 text-muted">
            <li><Link href={`/${tenant.slug}/shop`} className="hover:text-primary">All Jewellery</Link></li>
            <li><Link href={`/${tenant.slug}/shop?material=gold`} className="hover:text-primary">Gold</Link></li>
            <li><Link href={`/${tenant.slug}/shop?material=silver`} className="hover:text-primary">Silver</Link></li>
            <li><Link href={`/${tenant.slug}/rates`} className="hover:text-primary">Today&apos;s Rates</Link></li>
            <li><Link href={`/${tenant.slug}/schemes`} className="hover:text-primary">Savings Schemes</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Services</div>
          <ul className="space-y-2 text-muted">
            <li><Link href={`/${tenant.slug}/appointment`} className="hover:text-primary">Book Appointment</Link></li>
            <li><Link href={`/${tenant.slug}/exchange`} className="hover:text-primary">Old Gold Exchange</Link></li>
            <li><Link href={`/${tenant.slug}/contact`} className="hover:text-primary">Contact & Query</Link></li>
            <li><a href={whatsappLink} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp Us</a></li>
            <li><Link href={`/account/orders`} className="hover:text-primary">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Store</div>
          <ul className="space-y-2 text-muted">
            <li>Phone: {tenant.phone || "—"}</li>
            <li>Email: {tenant.contactEmail || "—"}</li>
            <li>GSTIN: {tenant.gstin || "—"}</li>
            <li className="pt-2 text-xs">Secure payments · BIS Hallmark · Insured delivery</li>
          </ul>
        </div>
      </div>
      <div className="hairline" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-2 justify-between text-xs text-muted">
        <span>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</span>
        <span>Powered by Jewel Portal</span>
      </div>
    </footer>
  );
}
