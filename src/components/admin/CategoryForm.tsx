"use client";

import { useActionState, useState } from "react";
import { saveCategory, updateCategory, toggleCategory, type CategoryState } from "@/actions/admin/catalog";
import { defaultCategoryIcon } from "@/lib/category-icons";

type Cat = { id: string; name: string; slug: string; axis: string; image: string; active: boolean };

const AXES = ["TYPE", "MATERIAL", "AUDIENCE", "OCCASION"] as const;

async function uploadIcon(file: File): Promise<{ url?: string; error?: string }> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) return { error: json.error ?? "Upload failed." };
    return { url: json.url };
  } catch {
    return { error: "Upload failed." };
  }
}

function IconPreview({ image, axis, slug }: { image: string; axis: string; slug: string }) {
  if (image && /^(https?:\/\/|\/)/.test(image)) {
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded icon; arbitrary remote URLs need plain img
    return <img src={image} alt="" className="h-7 w-7 object-contain shrink-0" />;
  }
  return <span className="grid h-7 w-7 shrink-0 place-items-center text-lg leading-none">{image || defaultCategoryIcon(slug, axis)}</span>;
}

function IconPicker({ initial, name }: { initial: string; name: string }) {
  const [url, setUrl] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div>
      <label className="label" htmlFor={`icon-${name}`}>Icon — emoji or image URL (blank = default)</label>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(0,0,0,.06)" }}>
          {url && /^(https?:\/\/|\/)/.test(url) ? (
            // eslint-disable-next-line @next/next/no-img-element -- live preview of owner icon
            <img src={url} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <span className="text-base leading-none">{url || "✦"}</span>
          )}
        </span>
        <input
          id={`icon-${name}`}
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input !min-h-9 text-sm flex-1"
          placeholder="💍 or https://… or upload"
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            setErr("");
            const r = await uploadIcon(f);
            setUploading(false);
            if (r.error) setErr(r.error);
            else if (r.url) setUrl(r.url);
          }}
        />
        {uploading ? <span className="text-muted">Uploading…</span> : null}
        {err ? <span style={{ color: "var(--c-danger)" }}>{err}</span> : null}
        {!url ? <span className="text-muted">Using default icon</span> : null}
      </div>
    </div>
  );
}

export function CategoryForm() {
  const [state, action, pending] = useActionState<CategoryState, FormData>(saveCategory, {});
  if (state?.ok) {
    return <p className="text-sm" style={{ color: "var(--c-primary)" }}>Category added ✓ <button type="button" className="underline" onClick={() => location.reload()}>Add another</button></p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="cat-name">Name</label>
        <input id="cat-name" name="name" required className="input !min-h-9 text-sm !w-44" placeholder="Rings" />
      </div>
      <div>
        <label className="label" htmlFor="cat-axis">Axis</label>
        <select id="cat-axis" name="axis" className="input !min-h-9 text-sm !w-36" defaultValue="TYPE">
          <option value="TYPE">Type</option>
          <option value="MATERIAL">Material</option>
          <option value="AUDIENCE">Audience</option>
          <option value="OCCASION">Occasion</option>
        </select>
      </div>
      <div className="flex-1 min-w-52">
        <IconPicker initial="" name="icon" />
      </div>
      <button className="btn btn-ghost !min-h-9 text-sm" disabled={pending}>{pending ? "…" : "Add"}</button>
      {state?.error ? <span className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</span> : null}
    </form>
  );
}

function CategoryRow({ cat }: { cat: Cat }) {
  const [edit, setEdit] = useState(false);
  const [state, setState] = useState<CategoryState | null>(null);
  const [pending, setPending] = useState(false);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateCategory({}, fd);
    setPending(false);
    setState(res);
    if (res.ok) setEdit(false);
  }

  if (edit) {
    return (
      <li className="rounded-lg p-2 space-y-2" style={{ background: "rgba(0,0,0,.04)" }}>
        <form onSubmit={onSave} className="space-y-2">
          <input type="hidden" name="id" value={cat.id} />
          <div>
            <label className="label" htmlFor={`name-${cat.id}`}>Name</label>
            <input id={`name-${cat.id}`} name="name" defaultValue={cat.name} className="input !min-h-9 text-sm w-full" />
          </div>
          <IconPicker initial={cat.image} name="icon" />
          <div className="flex items-center gap-2">
            {state?.error ? <span className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</span> : null}
            <span className="ml-auto flex gap-2">
              <button type="button" className="text-xs underline" onClick={() => setEdit(false)}>Close</button>
              <button type="submit" className="btn btn-primary !min-h-8 text-xs" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            </span>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 min-w-0">
        <IconPreview image={cat.image} axis={cat.axis} slug={cat.slug} />
        <span className="truncate text-sm" style={cat.active ? undefined : { textDecoration: "line-through", opacity: 0.5 }}>{cat.name}</span>
        {state?.ok ? <span className="text-xs" style={{ color: "#15803d" }}>Saved ✓</span> : null}
        {state?.error ? <span className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</span> : null}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <button type="button" className="text-xs underline" onClick={() => setEdit(true)}>Edit</button>
        <form action={toggleCategory}>
          <input type="hidden" name="id" value={cat.id} />
          <button className="text-xs underline">{cat.active ? "Disable" : "Enable"}</button>
        </form>
      </span>
    </li>
  );
}

export function CategoryList({ categories }: { categories: Cat[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
      {AXES.map((axis) => {
        const list = categories.filter((c) => c.axis === axis);
        return (
          <div key={axis}>
            <p className="text-xs uppercase tracking-wide text-muted mb-2">{axis}</p>
            <ul className="space-y-1.5">
              {list.map((c) => (
                <CategoryRow key={c.id} cat={c} />
              ))}
              {list.length === 0 ? <li className="text-muted">None yet</li> : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
