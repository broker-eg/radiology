# Radiology Reporting Suite

Structured radiology report generators (CT, MRI, ultrasound, X-ray, fluoroscopy) edited by
Dr. Yasser Shalaby, MD — rebuilt from a single 75 MB offline HTML file into a React app on
GitHub Pages with a Supabase backend.

- **93 generators** in 12 body regions: 69 run inside the suite (sandboxed), 24 open AWS Quick.
- **Accounts & plans**: anyone can sign up on **Free**; **Pro** unlocks every generator.
  Admins move users between plans in the **Users** portal (`#/admin`).
- **Tour with arrows**: on a new account's first sign-in (remembered per user in
  `profiles.onboarded_at`) the tour frames each real control — search, regions/filters, a
  generator, your plan, Install, the **?** — with an ROI box and an arrow annotation. The **?**
  in the header replays it.
- **Installable, suggested from the first visit**: an install sheet appears on the sign-in screen
  too (once per visit; _Not now_ snoozes it for 3 days). Chrome/Edge get one-tap _Install_;
  Safari (iOS ≤ 18 and 26+), iPad, Chrome on iOS and Android browsers get their own steps with
  an arrow at the browser button to tap; in-app browsers are told to open Safari/Chrome first.
- **English or Arabic, dark or light**: English + dark is the default; both are switched from the
  account menu (or the corner of the sign-in screen) and remembered per device. Arabic flips the
  whole interface to right-to-left; catalog text from the database stays as written.
- **Phone-first**: compact generator rows, a search that moves into the header as you scroll,
  filters in a bottom sheet, the Launch button pinned in the details sheet, 40 px+ touch targets.
- **Fast on repeat visits**: the catalog paints from the last visit's copy while it refreshes;
  opened generators are kept on the device per version; covers, fonts and the app shell are
  cached by the service worker (slow network → saved shell after 2.5 s). All of it is wiped on
  sign-out.

## Stack

React 18 + TypeScript (strict) + Vite + Tailwind, TanStack Query, React Router (HashRouter) ·
Supabase (Postgres + Auth + Storage, security entirely in RLS) · Nix flake dev shell · pnpm.

## Develop

Everything runs inside the Nix shell — nothing is installed globally.

```sh
nix develop                     # or: direnv allow (uses .envrc)
pnpm install
pnpm dev                        # http://localhost:5173 — talks to the real Supabase project
pnpm typecheck && pnpm lint     # must be green
pnpm build                      # production bundle in dist/
```

Without flakes enabled globally:
`nix --extra-experimental-features 'nix-command flakes' develop --command pnpm dev`.

Config: `.env.production` (committed) holds the Supabase URL and **publishable** key — both
public by design. For a different project, copy `.env.example` to `.env.local`.

## Plans, roles and access

|       | Browse catalog | Open Free generators | Open Pro generators | Edit catalog / manage users |
| ----- | -------------- | -------------------- | ------------------- | --------------------------- |
| Free  | ✓              | ✓                    | –                   | –                           |
| Pro   | ✓              | ✓                    | ✓                   | –                           |
| Admin | ✓              | ✓                    | ✓                   | ✓                           |

- **The first account that signs up becomes the admin** (bootstrap trigger). Later accounts
  start as Free users. Admins can promote other admins in the Users portal.
- Plan access is enforced by Supabase, not the UI: Storage RLS only serves a generator's HTML
  to Pro/admin accounts unless that app's `tier` is `free`.
- Which generators are Free is a per-app setting (admin → app → Edit → Plan). Seeded default:
  _General & Normal Studios_ and _X-Ray & Plain Film_ are Free; everything else is Pro.

## Supabase

Project `jnpkukgwsuvzehwxjxfc` — schema in `supabase/migrations/` (applied):

- `categories`, `apps` (catalog), `profiles` (role + plan), `favorites` — all with RLS.
- Storage: `app-html` (private, plan-gated generator HTML), `app-covers` (public images).
- RPCs: `admin_list_users`, `admin_set_plan`, `admin_set_role`, `admin_delete_user` (SECURITY
  DEFINER, admin-only; delete refuses your own account and other admins — remove admin first).
- RLS smoke test: `scripts/rls_check.sql` (read-only, rolled back).

To push future migrations: `supabase link --project-ref jnpkukgwsuvzehwxjxfc` then
`pnpm db:push`; regenerate types with `pnpm db:types`. Without the database password, use the
Management API instead: put a personal access token in `.secrets/supabase-access-token`
(git-ignored) and run `node scripts/supabase-api.mjs migrate`.

### Dashboard settings to check (Authentication)

- **Email → Confirm email**: turn it **off** so sign-up logs people in immediately — or keep
  it on and configure custom SMTP (Supabase's built-in mailer only delivers to your own team).
- **URL Configuration**: Site URL `https://broker-eg.github.io/radiology/` and add it to the
  redirect allow-list (needed for confirmation links if you keep them on).

## Deploy (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`.
One-time: repo → **Settings → Pages → Source: GitHub Actions**. The site is served at
`https://broker-eg.github.io/radiology/` (relative base, HashRouter → no 404 page needed).

## Legacy migration scripts

The original offline file is not in git. To re-run the import:

```sh
node scripts/extract-legacy.mjs <legacy.html> legacy-extract src/assets/branding
node scripts/build-seed-sql.mjs legacy-extract/catalog.json > supabase/seed.sql
SUPABASE_URL=… SUPABASE_TOKEN=<admin access token> node scripts/seed-remote.mjs legacy-extract
scripts/make-icons.sh            # re-render the app icons from public/*.svg
```

The extractor writes the branding images as JPEG; the app ships WebP. Re-encode with
`nix shell --inputs-from . nixpkgs#libwebp -c cwebp -q 72 hero.jpg -o hero.webp` (portrait:
`-resize 160 160`) and delete the JPEGs.

## Layout

```
flake.nix .envrc                Nix dev shell
supabase/migrations/            schema, RLS, storage, grants
scripts/                        legacy import, icons, RLS check
public/                         manifest, service worker, icons
src/app/                        config (env), providers (auth, query)
src/features/auth|catalog|admin api/ (only place that imports Supabase) → hooks/ → components/ → routes/
src/components/                 shared UI (Dialog, Viewport, SiteHeader, AccountMenu, InstallPrompt…)
src/features/onboarding/        the arrow tour (CoachTour)
src/lib/                        supabase client, query client (+ persistence), toast, PWA, theme
src/lib/i18n/                   en.ts (source of truth) + ar.ts — every interface string
src/assets/fonts/               self-hosted Archivo, Plex Arabic, signature-subset Newsreader
```
