#!/usr/bin/env node
// Seeds a Supabase project from the extracted legacy suite: catalog rows (categories +
// apps, upserted through PostgREST) and Storage objects (69 generators + 93 covers).
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_TOKEN=<jwt> \
//     node scripts/seed-remote.mjs <legacy-extract-dir> [--skip-rows] [--skip-files]
//
// SUPABASE_TOKEN must be allowed to write `categories`, `apps` and the `app-html` /
// `app-covers` buckets — normally an admin user's access token. Re-running is safe:
// rows are upserted (an app's `tier` is never overwritten) and objects use x-upsert.

import fs from 'node:fs';
import path from 'node:path';
import { toRows } from './lib/catalog-rows.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const skipRows = args.includes('--skip-rows');
const skipFiles = args.includes('--skip-files');
const { SUPABASE_URL, SUPABASE_TOKEN, SUPABASE_APIKEY } = process.env;
if (!dir || !SUPABASE_URL || !SUPABASE_TOKEN) {
  console.error('usage: SUPABASE_URL=… SUPABASE_TOKEN=… seed-remote.mjs <legacy-extract-dir>');
  process.exit(1);
}

const authHeaders = {
  apikey: SUPABASE_APIKEY ?? SUPABASE_TOKEN,
  authorization: `Bearer ${SUPABASE_TOKEN}`,
};

async function upsertRows(table, rows, onConflict, { insertOnly = [] } = {}) {
  // Two passes keep `tier` (and other insertOnly columns) untouched on existing rows:
  // 1) insert missing rows with every column, 2) update the rest without those columns.
  const insert = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!insert.ok) throw new Error(`${table} insert: ${insert.status} ${await insert.text()}`);
  const strip = (r) =>
    Object.fromEntries(Object.entries(r).filter(([k]) => !insertOnly.includes(k)));
  const update = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows.map(strip)),
  });
  if (!update.ok) throw new Error(`${table} upsert: ${update.status} ${await update.text()}`);
  console.log(`${table}: ${rows.length} rows`);
}

if (!skipRows) {
  const { categoryRows, appRows } = toRows(
    JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json'), 'utf8')),
  );
  await upsertRows('categories', categoryRows, 'name');
  await upsertRows('apps', appRows, 'id', { insertOnly: ['tier'] });
}

if (!skipFiles) {
  const jobs = [
    ...fs.readdirSync(path.join(dir, 'html')).map((f) => ({
      bucket: 'app-html',
      file: path.join(dir, 'html', f),
      name: f,
      type: 'text/html',
      cache: '3600',
    })),
    ...fs.readdirSync(path.join(dir, 'covers')).map((f) => ({
      bucket: 'app-covers',
      file: path.join(dir, 'covers', f),
      name: f,
      type: 'image/jpeg',
      cache: '604800',
    })),
  ];

  const upload = async (job) => {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${job.bucket}/${encodeURIComponent(job.name)}`,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          'content-type': job.type,
          'cache-control': `max-age=${job.cache}`,
          'x-upsert': 'true',
        },
        body: fs.readFileSync(job.file),
      },
    );
    if (!res.ok) throw new Error(`${job.bucket}/${job.name}: ${res.status} ${await res.text()}`);
  };

  let done = 0;
  const failures = [];
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          await upload(job);
        } catch (err) {
          failures.push(String(err));
        }
        done++;
        if (done % 25 === 0 || done === jobs.length) console.log(`storage: ${done}/${jobs.length}`);
      }
    }),
  );
  if (failures.length) {
    console.error(`${failures.length} upload(s) failed:\n${failures.join('\n')}`);
    process.exit(1);
  }
  console.log(`storage: uploaded ${jobs.length} objects`);
}
