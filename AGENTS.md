<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project gates (run before finishing any task)

```bash
npx tsc --noEmit              # types must be clean
npx eslint src --max-warnings=0
npm test                      # vitest unit tests (tests/)
npx next build                # must succeed
```

## Conventions

- Money = integer **paise**, weight = integer **milligrams** (`src/lib/money.ts` helpers).
- SQLite → `String` columns for JSON (`imagesJson` etc.); parse via `catalog.parseImages`.
- Auth: `jp_session` cookie; pools `shop` (OWNER/STAFF/CUSTOMER) and `platform` (SUPER_ADMIN). `requireSession()` throws plain `Error("UNAUTHORIZED")` — pages use `getSession()` + `redirect()` instead. `getSession()` also accepts `Authorization: Bearer <jwt>` (same token) for native/mobile callers.
- Android/native REST lives under `src/app/api/v1/*` (see `docs/API.md`); web mutations stay as server actions.
- Server actions: plain `<form action>` → `(formData)`; `useActionState` → `(prev, formData)`.
- Multi-tenant routes are path-scoped `/{slug}/...`; guard with `requireTenant(slug)` and feature-gate with `hasFeature(tenant, key)`.
- Admin RBAC: `can(session, module, action)` from `src/lib/auth.ts`; modules in `PERMISSION_MODULES`.
- E2E form posts use React's progressive-enhancement protocol (hidden `$ACTION_*` inputs, multipart POST to the page URL) — see scripts history / `tests/`.
