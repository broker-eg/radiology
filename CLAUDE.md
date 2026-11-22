# Radiology Reporting Suite — Project Guide

Read `README.md` first (what the app is, plans/roles, deploy). This file is the working guide.

## Git workflow

- Work directly on `main` in the root checkout; no worktrees, no feature branches.
- Run the checks below, then commit only the intended files.

## Environment

- **Always work inside the Nix shell** — never install tools globally:
  `nix --extra-experimental-features 'nix-command flakes' develop --command bash -c '<cmd>'`
- Extra tools for one-off jobs come from the flake's pinned nixpkgs:
  `nix shell --inputs-from . nixpkgs#<pkg>` (e.g. `librsvg` in `scripts/make-icons.sh`).

## Commands (`pnpm …`, inside the Nix shell)

- `dev` · `build` (`tsc --noEmit && vite build`) · `typecheck` · `lint` · `format` · `preview`
- `db:push` (after `supabase link --project-ref jnpkukgwsuvzehwxjxfc`) · `db:types`
- **Applying migrations (agents)**: `node scripts/supabase-api.mjs migrate` — runs pending
  `supabase/migrations/*.sql` through the Management API with the personal access token in
  `.secrets/supabase-access-token` (git-ignored; or `$SUPABASE_ACCESS_TOKEN`), records them in
  `supabase_migrations.schema_migrations` like `db push`, and reloads the PostgREST cache.
  `… migrations` lists applied/pending; `… sql "<sql>"` / `… file x.sql` run ad-hoc SQL.
  Ship order for a feature: migrate → verify → push `main` (deploys) → check the live page.
- Verify a change: `pnpm typecheck && pnpm lint` green, plus `scripts/rls_check.sql` after
  any schema/RLS change.

## Architecture

- React 18 + TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`) + Vite + Tailwind; TanStack Query for server state; HashRouter.
- **Layering (ESLint-enforced)**: components → hooks (`features/*/hooks`) → services
  (`features/*/api`, the ONLY files importing `@/lib/supabase`, mapping rows → camelCase
  domain types in `src/types/domain.ts`) → RLS.
- `src/types/database.ts` is generated (`pnpm db:types`); don't hand-edit beyond regenerating.
- Deep links live in the query string under the hash: `#/?app=<id>` (details),
  `#/?run=<id>` (workspace) — the phone's back button closes them.

## Security model (Supabase)

- RLS on every table. Signed-in users read the catalog; only admins write it.
- `profiles.plan` / `profiles.role` change ONLY through `admin_set_plan` / `admin_set_role`
  (SECURITY DEFINER + `is_admin()` check). Users may update only `full_name`, `hero_app_id`
  (column grants).
- Plan gating is enforced on Storage: `app-html` objects are readable by Pro/admin, or when
  the app row's `tier = 'free'`.
- Generators run in `<iframe sandbox>` **without** `allow-same-origin` (see
  `features/catalog/lib/launch.ts`) so uploaded HTML can't read the Supabase session.
- Accounts are deleted only through `admin_delete_user` (admin-only; never self, never an
  admin — demote first). It deletes the `auth.users` row; profile and favorites cascade.
- First account to sign up becomes admin (`handle_new_user` trigger).

## Interface conventions

- **Strings**: no literal UI text in components. Add the key to `src/lib/i18n/en.ts` and the same
  key to `ar.ts` (the `Messages` type enforces it), read it with `useT()` in components or
  `t()` in hooks/services. Arabic counts use `count()` (Intl.PluralRules) in `ar.ts`.
- **RTL**: logical utilities only — `ms-/me-/ps-/pe-/start-/end-/text-start/text-end/border-s`,
  never `ml-/mr-/pl-/pr-/left-/right-/text-left`. Arrow icons that point along the reading
  direction get `flip-rtl`. Database text (names, badges, descriptions) gets `data-text` so
  English clips at its own end inside the Arabic layout.
- **Theme**: colours are CSS variables (`src/styles/index.css`); use the `ink`, `film`,
  `localizer`, `caliper` and `alert` classes, never hex. Dark is the default. `Viewport` is
  always `scheme-dark` (images are dark films in both themes) — put `scheme-dark` on anything
  drawn over an image.
- **Tour**: steps find controls by `data-tour="…"` (first visible match wins) — keep those
  attributes when restyling the header, hero search, browse area, tiles, Add generator, Install.
- **Speed**: `apps/categories/profile/favorites` persist to localStorage (`lib/persistQueries`);
  generator HTML lives in Cache Storage keyed by `updated_at` (`catalogService.fetchAppHtml`).
  Both are cleared on `SIGNED_OUT` in `AuthProvider` — keep that if you add per-user caches.
- **Offline**: explicit downloads live in Cache Storage `radiology-offline-v1`
  (`features/offline/api/offlineStore.ts`, details in an `x-offline-meta` header);
  `fetchAppHtml` falls back to them (any version) offline or after 4 s of a silent network.
  Generator-HTML queries use `networkMode: 'always'` — they must run with no connection.
  `public/sw.js` precaches the build: `vite.config.ts` fills `BUILD`/`PRECACHE` at build time.
  Any page-owned cache must be listed in the worker's `KEEP`, or a deploy wipes it. Offline with
  an expired token, `AuthProvider` runs from the stored session (`readStoredSession`,
  `auth.offline`) instead of waiting ~25 s for supabase-js to give up refreshing.
- Screens are checked at 390 px (phone) and 1440 px, in English/dark, English/light and Arabic.

## Gotchas

- This Supabase project does **not** auto-grant new tables to `anon`/`authenticated`. Every
  new table needs explicit `grant …` in its migration (see `grants_for_api_roles`), or the
  API returns "permission denied" even with correct RLS.
- Auth "Confirm email" is ON by default and the built-in mailer only reaches team members —
  turn it off (or add SMTP) in the dashboard. It can't be changed from SQL/MCP.
- Migrations are forward-only once applied; keep local filenames equal to the remote
  version (`supabase/migrations/<version>_<name>.sql`).
- Design language ("reading room"; light theme = "lightbox"): grayscale film tones on navy;
  cyan = interactive/focus/tour arrows, gold = Pro + the editor's signature. Metadata goes in
  image corners (`components/Viewport`) like DICOM annotations. Archivo (with width axis),
  IBM Plex Sans Arabic for Arabic glyphs only, Newsreader italic for the signature only (its
  font file is subset to the signature's letters — re-subset if that text changes).
