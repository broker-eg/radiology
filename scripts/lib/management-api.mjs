// Supabase Management API helpers for the scripts — no database password, no CLI login.
// Token: $SUPABASE_ACCESS_TOKEN, else .secrets/supabase-access-token (git-ignored).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'jnpkukgwsuvzehwxjxfc';
export const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

export function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return readFileSync(join(ROOT, '.secrets', 'supabase-access-token'), 'utf8').trim();
  } catch {
    console.error('No token: set SUPABASE_ACCESS_TOKEN or write .secrets/supabase-access-token');
    process.exit(2);
  }
}

/** Runs SQL as the database owner; returns the result rows. */
export async function query(sql) {
  const res = await fetch(`${API}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

let serviceKey;
/**
 * The project's service-role key, fetched on demand and kept only in memory — for the
 * Storage API, which the Management API has no upload endpoint for. Never print it.
 */
async function storageKey() {
  if (serviceKey) return serviceKey;
  const res = await fetch(`${API}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`api-keys: HTTP ${res.status}`);
  const keys = await res.json();
  const key =
    keys.find((k) => k.type === 'legacy' && k.name === 'service_role') ??
    keys.find((k) => k.type === 'secret');
  if (!key?.api_key) throw new Error('api-keys: no service-role or secret key available');
  serviceKey = key.api_key;
  return serviceKey;
}

/** Creates or replaces one Storage object. */
export async function uploadObject(bucket, name, body, { contentType, cacheSeconds = 3600 }) {
  const key = await storageKey();
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': contentType,
        'Cache-Control': `max-age=${cacheSeconds}`,
        'x-upsert': 'true',
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`${bucket}/${name}: HTTP ${res.status} ${await res.text()}`);
}
