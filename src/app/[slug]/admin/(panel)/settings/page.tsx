import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleBranch } from "@/actions/admin/settings";
import {
  ProfileForm,
  PaymentsForm,
  CommercialsForm,
  WhatsAppForm,
  FeaturesForm,
  ThemeForm,
  BranchForm,
  StaffAddForm,
  StaffResetForm,
  StaffDeactivateButton,
  type ShopSeed,
} from "@/components/admin/SettingsForms";

export const metadata = { title: "Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || !(await can(session, "settings", "view"))) redirect(`/${slug}/admin`);

  const [shop, themes, flags, branches, staff] = await Promise.all([
    db.shop.findUnique({ where: { id: tenant.id } }),
    db.theme.findMany({ orderBy: { name: "asc" } }),
    db.featureFlag.findMany({ where: { shopId: tenant.id } }),
    db.branch.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { shopId: tenant.id, role: "STAFF" }, orderBy: { name: "asc" } }),
  ]);
  if (!shop) redirect(`/${slug}/admin`);

  const seed: ShopSeed = {
    name: shop.name,
    tagline: shop.tagline,
    contactEmail: shop.contactEmail,
    phone: shop.phone,
    address: shop.address,
    state: shop.state,
    gstin: shop.gstin,
    pan: shop.pan,
    announcement: shop.announcement,
    whatsappNumber: shop.whatsappNumber,
    whatsappGreeting: shop.whatsappGreeting,
    whatsappEnabled: shop.whatsappEnabled,
    upiVpa: shop.upiVpa,
    upiName: shop.upiName,
    razorpayKeyId: shop.razorpayKeyId,
    razorpaySecret: shop.razorpaySecret,
    enableRazorpay: shop.enableRazorpay,
    enableCod: shop.enableCod,
    enableUpiQr: shop.enableUpiQr,
    codFeePaise: shop.codFeePaise,
    codMaxPaise: shop.codMaxPaise,
    platformFeePaise: shop.platformFeePaise,
    platformFeePercentBp: shop.platformFeePercentBp,
    gstPercentBp: shop.gstPercentBp,
    freeShippingAbovePaise: shop.freeShippingAbovePaise,
    shippingFlatPaise: shop.shippingFlatPaise,
    loyaltyEarnBp: shop.loyaltyEarnBp,
    loyaltyRedeemMaxBp: shop.loyaltyRedeemMaxBp,
  };
  const enabled: Record<string, boolean> = {};
  for (const f of flags) enabled[f.key] = f.enabled;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Shop profile, payments, features, theme, branches and staff logins.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <ProfileForm shop={seed} />
        <div className="space-y-5">
          <PaymentsForm shop={seed} />
          <CommercialsForm shop={seed} />
        </div>
        <WhatsAppForm shop={seed} />
        <ThemeForm
          themes={themes.map((t) => ({ id: t.id, name: t.name, key: t.key, description: t.description }))}
          currentId={shop.themeId}
        />
        <div className="lg:col-span-2">
          <FeaturesForm enabled={enabled} />
        </div>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Branches</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">GSTIN</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{b.name}{b.isDefault ? " · default" : ""}</td>
                  <td className="py-2 pr-3">{b.city || "—"}</td>
                  <td className="py-2 pr-3">{b.phone || "—"}</td>
                  <td className="py-2 pr-3 text-xs text-muted">{b.gstin || "—"}</td>
                  <td className="py-2">
                    <form action={toggleBranch} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.active ? "" : "text-muted"}`} style={{ background: b.active ? "rgba(22,163,74,.12)" : "rgba(0,0,0,.06)", color: b.active ? "#16a34a" : undefined }}>
                        {b.active ? "Active" : "Off"}
                      </span>
                      <button className="text-xs underline text-muted">{b.active ? "Disable" : "Enable"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {branches.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted">No branches yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <details className="rounded-xl border" style={{ borderColor: "rgba(0,0,0,.1)" }}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Add a branch</summary>
          <div className="p-4 pt-0">
            <BranchForm />
          </div>
        </details>
      </section>

      {session.role === "OWNER" ? (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <StaffAddForm />
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold">Staff logins</h2>
            {staff.length === 0 ? (
              <p className="text-sm text-muted">No staff users yet.</p>
            ) : (
              <ul className="space-y-4">
                {staff.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                    <div className="text-sm">
                      <p className="font-medium">{u.name} {!u.active ? <span className="text-xs text-muted">(deactivated)</span> : null}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <StaffResetForm userId={u.id} name={u.name} />
                      <StaffDeactivateButton userId={u.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
