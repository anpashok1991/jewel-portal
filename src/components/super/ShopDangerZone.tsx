"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleShop, deleteShop } from "@/actions/super";

/**
 * Super-admin shop access controls:
 * - Block/unblock shop access (non-payment suspension) — 1 click.
 * - Delete shop + all data — 2 clicks with a red confirmation panel.
 */
export default function ShopDangerZone({ shopId, shopName, blocked }: { shopId: string; shopName: string; blocked: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const nameMatches = typed.trim().toLowerCase() === shopName.toLowerCase();

  return (
    <section className="card p-5 space-y-4" style={{ background: "#1a1013", borderColor: "rgba(248,113,113,.35)" }}>
      <div>
        <h2 className="font-semibold" style={{ color: "#f87171" }}>Danger zone</h2>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>
          Suspend access for non-payment, or permanently delete this shop and all of its data.
        </p>
      </div>

      {/* block / unblock */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: "rgba(255,255,255,.1)" }}>
        <div>
          <p className="text-sm font-medium">{blocked ? "Access is currently BLOCKED" : "Block shop access"}</p>
          <p className="text-xs" style={{ color: "var(--c-muted)" }}>
            {blocked
              ? "The storefront and admin return 404 for everyone. Data is kept."
              : "Immediately hides the storefront and locks the admin if the owner hasn't paid."}
          </p>
        </div>
        <form
          action={() =>
            startTransition(async () => {
              const fd = new FormData();
              fd.append("id", shopId);
              await toggleShop(fd);
              router.refresh();
            })
          }
        >
          <button
            className="btn !min-h-10 text-sm"
            disabled={pending}
            style={{
              borderColor: blocked ? "rgba(74,222,128,.5)" : "rgba(248,113,113,.5)",
              color: blocked ? "#4ade80" : "#f87171",
            }}
          >
            {pending ? "Working…" : blocked ? "Restore access" : "Block access"}
          </button>
        </form>
      </div>

      {/* delete — step 1: red button; step 2: red confirm panel */}
      <div className="rounded-xl border p-4" style={{ borderColor: "rgba(248,113,113,.35)" }}>
        {!confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Delete shop permanently</p>
              <p className="text-xs" style={{ color: "var(--c-muted)" }}>
                Removes {shopName} and every product, order, customer link, scheme and file. Cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="btn !min-h-10 text-sm"
              style={{ background: "#b91c1c", color: "#fff", borderColor: "#b91c1c" }}
              onClick={() => setConfirming(true)}
            >
              Delete shop…
            </button>
          </div>
        ) : (
          <div className="space-y-3" style={{ background: "rgba(185,28,28,.12)", borderRadius: 12, padding: 16 }}>
            <p className="text-sm font-bold" style={{ color: "#f87171" }}>
              ⚠ This permanently deletes {shopName} — products, orders, invoices, schemes, staff accounts, everything.
            </p>
            <p className="text-xs" style={{ color: "var(--c-muted)" }}>
              Type the shop name <b style={{ color: "#f87171" }}>{shopName}</b> to confirm, then press Delete.
            </p>
            <input
              className="input"
              style={{ background: "#12090b", borderColor: "rgba(248,113,113,.4)", color: "#fff" }}
              placeholder={shopName}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn !min-h-10 text-sm"
                disabled={!nameMatches || pending}
                style={{ background: nameMatches ? "#b91c1c" : "#4b1d1d", color: "#fff", borderColor: "#b91c1c", opacity: nameMatches ? 1 : 0.6 }}
                onClick={() =>
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.append("id", shopId);
                    await deleteShop(fd);
                    router.push("/super/shops");
                    router.refresh();
                  })
                }
              >
                {pending ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                type="button"
                className="btn btn-ghost !min-h-10 text-sm"
                disabled={pending}
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
