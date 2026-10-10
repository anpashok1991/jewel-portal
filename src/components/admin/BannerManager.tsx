"use client";

import { useActionState, useState } from "react";
import { saveBanner, toggleBanner, deleteBanner, type ManageState } from "@/actions/admin/manage";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  videoUrl: string;
  href: string;
  placement: string;
  active: boolean;
  sortOrder: number;
};

function Msg({ state }: { state: ManageState }) {
  if (state?.error) return <p className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</p>;
  if (state?.ok) return <p className="text-xs" style={{ color: "#15803d" }}>Saved ✓</p>;
  return null;
}

export default function BannerManager({ banners }: { banners: BannerRow[] }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveBanner, {});
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const heroes = banners.filter((b) => b.placement === "HERO");
  const others = banners.filter((b) => b.placement !== "HERO");

  async function onUpload(file: File) {
    setUploading(true);
    setUploadErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) setUploadErr(json.error ?? "Upload failed.");
      else setImageUrl(json.url);
    } catch {
      setUploadErr("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Hero carousel</h2>
          <p className="text-sm text-muted">
            Slides on your storefront home. Leave image empty to show the default jewellery artwork, or paste an image URL / upload one.
          </p>
        </div>
        {editing ? (
          <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setEditing(null)}>Cancel edit</button>
        ) : null}
      </div>

      <form action={action} className="grid sm:grid-cols-2 gap-3 text-sm">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div>
          <label className="label" htmlFor="bn-title">Title</label>
          <input id="bn-title" name="title" required defaultValue={editing?.title ?? ""} className="input" placeholder="Festive Gold Festival" />
        </div>
        <div>
          <label className="label" htmlFor="bn-sub">Subtitle</label>
          <input id="bn-sub" name="subtitle" defaultValue={editing?.subtitle ?? ""} className="input" placeholder="Up to 25% off making charges" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="bn-image">Image URL (optional — blank uses jewelry artwork)</label>
          <input id="bn-image" name="image" value={imageUrl || editing?.image || ""} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://… or upload below" />
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
            {uploading ? <span className="text-xs text-muted">Uploading…</span> : null}
            {uploadErr ? <span className="text-xs" style={{ color: "var(--c-danger)" }}>{uploadErr}</span> : null}
            {imageUrl ? <span className="text-xs" style={{ color: "#15803d" }}>Image set ✓</span> : null}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bn-video">YouTube URL (optional)</label>
          <input id="bn-video" name="videoUrl" defaultValue={editing?.videoUrl ?? ""} className="input" placeholder="https://youtube.com/watch?v=…" />
        </div>
        <div>
          <label className="label" htmlFor="bn-href">Link (e.g. /{`{slug}`}/shop?material=gold)</label>
          <input id="bn-href" name="href" defaultValue={editing?.href ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bn-placement">Placement</label>
          <select id="bn-placement" name="placement" defaultValue={editing?.placement ?? "HERO"} className="input">
            <option value="HERO">Hero carousel</option>
            <option value="SECTION">Section banner</option>
            <option value="STRIP">Strip</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bn-sort">Sort order</label>
          <input id="bn-sort" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Msg state={state} />
          <button className="btn btn-primary !min-h-10 text-sm ml-auto" disabled={pending}>
            {pending ? "Saving…" : editing ? "Update slide" : "Add slide"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Slide</th>
              <th className="py-2 pr-3">Placement</th>
              <th className="py-2 pr-3">Media</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...heroes, ...others].map((b) => (
              <tr key={b.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted">{b.subtitle}</p>
                </td>
                <td className="py-2.5 pr-3 text-xs">{b.placement}</td>
                <td className="py-2.5 pr-3 text-xs">{b.videoUrl ? "YouTube" : b.image ? "Image" : "Artwork"}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: b.active ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)", color: b.active ? "#15803d" : "inherit" }}>
                    {b.active ? "live" : "off"}
                  </span>
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs underline font-semibold mr-2"
                    onClick={() => {
                      setEditing(b);
                      setImageUrl(b.image);
                    }}
                  >
                    Edit
                  </button>
                  <form action={toggleBanner} className="inline mr-2">
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="text-xs underline">{b.active ? "Hide" : "Show"}</button>
                  </form>
                  {confirmDel === b.id ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        className="font-bold"
                        style={{ color: "var(--c-danger)" }}
                        onClick={() => {
                          const fd = new FormData();
                          fd.append("id", b.id);
                          void deleteBanner(fd).then(() => setConfirmDel(null));
                        }}
                      >
                        Sure? Delete
                      </button>
                      <button type="button" className="underline" onClick={() => setConfirmDel(null)}>no</button>
                    </span>
                  ) : (
                    <button type="button" className="text-xs underline" style={{ color: "var(--c-danger)" }} onClick={() => setConfirmDel(b.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {banners.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-muted">No slides yet — defaults to the jewellery artwork carousel.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
