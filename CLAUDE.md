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
- First account to sign up becomes admin (`handle_new_user` trigger).

## Gotchas

- This Supabase project does **not** auto-grant new tables to `anon`/`authenticated`. Every
  new table needs explicit `grant …` in its migration (see `grants_for_api_roles`), or the
  API returns "permission denied" even with correct RLS.
- Auth "Confirm email" is ON by default and the built-in mailer only reaches team members —
  turn it off (or add SMTP) in the dashboard. It can't be changed from SQL/MCP.
- Migrations are forward-only once applied; keep local filenames equal to the remote
  version (`supabase/migrations/<version>_<name>.sql`).
- Design language ("reading room"): grayscale film tones on navy; cyan = interactive/focus,
  gold = Pro + the editor's signature. Metadata goes in image corners (`components/Viewport`)
  like DICOM annotations. Archivo (with width axis) + Newsreader italic for the signature only.
