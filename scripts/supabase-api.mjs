#!/usr/bin/env node
// Run SQL on the Supabase project through the Management API — no database password needed.
// Token: $SUPABASE_ACCESS_TOKEN, else .secrets/supabase-access-token (git-ignored).
//
//   node scripts/supabase-api.mjs migrations        list applied vs local migrations
//   node scripts/supabase-api.mjs migrate           apply local migrations missing remotely
//   node scripts/supabase-api.mjs sql "select 1"    run SQL, print the result rows
//   node scripts/supabase-api.mjs file x.sql        run a .sql file
//
// `migrate` records each file in supabase_migrations.schema_migrations exactly like
// `supabase db push`, so the CLI and this script stay interchangeable.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'jnpkukgwsuvzehwxjxfc';
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return readFileSync(join(ROOT, '.secrets', 'supabase-access-token'), 'utf8').trim();
  } catch {
    console.error('No token: set SUPABASE_ACCESS_TOKEN or write .secrets/supabase-access-token');
    process.exit(2);
  }
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const quote = (s) => `'${s.replace(/'/g, "''")}'`;

function localMigrations() {
  return readdirSync(MIGRATIONS)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const [, version, name] = /^(\d+)_(.+)\.sql$/.exec(file);
      return { file, version, name, sql: readFileSync(join(MIGRATIONS, file), 'utf8') };
    });
}

async function appliedVersions() {
  const rows = await query(
    'select version from supabase_migrations.schema_migrations order by version',
  );
  return new Set(rows.map((r) => String(r.version)));
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'sql' && arg) {
  console.log(JSON.stringify(await query(arg), null, 2));
} else if (cmd === 'file' && arg) {
  console.log(JSON.stringify(await query(readFileSync(arg, 'utf8')), null, 2));
} else if (cmd === 'migrations') {
  const applied = await appliedVersions();
  for (const m of localMigrations())
    console.log(applied.has(m.version) ? 'applied ' : 'PENDING ', m.file);
} else if (cmd === 'migrate') {
  const applied = await appliedVersions();
  const pending = localMigrations().filter((m) => !applied.has(m.version));
  if (!pending.length) console.log('Up to date.');
  for (const m of pending) {
    // One transaction per file: the change and its history row land together or not at all.
    await query(`begin;
${m.sql}
insert into supabase_migrations.schema_migrations (version, name, statements)
values (${quote(m.version)}, ${quote(m.name)}, array[${quote(m.sql)}]);
commit;`);
    console.log('applied', m.file);
  }
  // PostgREST picks up new/changed functions and tables without waiting for its own reload.
  if (pending.length) await query(`notify pgrst, 'reload schema';`);
} else {
  console.error('usage: supabase-api.mjs migrations | migrate | sql "<sql>" | file <path.sql>');
  process.exit(1);
}
