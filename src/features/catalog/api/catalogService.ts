import { readOfflineApp, saveOfflineApp } from '@/features/offline/api/offlineStore';
import { t } from '@/lib/i18n';
import { isOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';
import type { AppDraft, AppKind, AppStatus, AppTier, Category, SuiteApp } from '@/types/domain';

const HTML_BUCKET = 'app-html';
const COVER_BUCKET = 'app-covers';

function coverUrl(path: string | null, version: string): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  // Version query → a replaced cover is fetched fresh, an unchanged one stays cached.
  return `${data.publicUrl}?v=${encodeURIComponent(version)}`;
}

function toApp(row: Tables<'apps'>): SuiteApp {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    modality: row.modality,
    status: row.status as AppStatus,
    badge: row.badge,
    description: row.description,
    duplicateOf: row.duplicate_of,
    kind: row.kind as AppKind,
    externalUrl: row.external_url,
    htmlPath: row.html_path,
    coverPath: row.cover_path,
    coverUrl: coverUrl(row.cover_path, row.updated_at),
    tier: row.tier as AppTier,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data.map((c) => ({
    name: c.name,
    icon: c.icon,
    subtitle: c.subtitle,
    color: c.color,
    sortOrder: c.sort_order,
  }));
}

export async function listApps(): Promise<SuiteApp[]> {
  const { data, error } = await supabase.from('apps').select('*').order('sort_order').order('name');
  if (error) throw error;
  return data.map(toApp);
}

export async function listFavoriteIds(): Promise<string[]> {
  // RLS scopes favorites to the signed-in user.
  const { data, error } = await supabase.from('favorites').select('app_id');
  if (error) throw error;
  return data.map((f) => f.app_id);
}

export async function addFavorite(appId: string): Promise<void> {
  const { error } = await supabase.from('favorites').insert({ app_id: appId });
  if (error && error.code !== '23505') throw error; // already a favorite → fine
}

export async function removeFavorite(appId: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('app_id', appId);
  if (error) throw error;
}

export class LockedGeneratorError extends Error {
  constructor() {
    super(t().workspace.lockedError);
    this.name = 'LockedGeneratorError';
  }
}

/** No connection, and this generator isn't on the device (never downloaded or opened). */
export class OfflineUnavailableError extends Error {
  constructor() {
    super(t().workspace.offlineError);
    this.name = 'OfflineUnavailableError';
  }
}

// Generators the person has opened stay on the device (Cache Storage), keyed by the app's
// updated_at: a re-launch tomorrow is instant, and an admin edit gets a fresh copy. Only
// files Storage already served to this account land here; signing out clears it.
const GENERATOR_CACHE = 'radiology-generators-v1';

function cachePrefix(path: string): string {
  return `${location.origin}/__generators/${encodeURIComponent(path)}?`;
}

function cacheKey(path: string, version: string): string {
  return `${cachePrefix(path)}v=${encodeURIComponent(version)}`;
}

async function openGeneratorCache(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(GENERATOR_CACHE) : null;
  } catch {
    return null; // private mode / storage disabled: just download every time
  }
}

export async function clearGeneratorCache(): Promise<void> {
  try {
    if ('caches' in window) await caches.delete(GENERATOR_CACHE);
  } catch {
    /* nothing cached */
  }
}

/** Whatever version of this generator was last opened here (offline: better than nothing). */
async function anyOpenedVersion(cache: Cache | null, path: string): Promise<string | null> {
  if (!cache) return null;
  const prefix = cachePrefix(path);
  const req = (await cache.keys()).find((r) => r.url.startsWith(prefix));
  const res = req ? await cache.match(req) : undefined;
  return res ? res.text() : null;
}

// A connection that neither works nor fails ("lie-fi"): when the device already has a copy,
// open it after this long rather than keep the person waiting on the network.
const SLOW_NETWORK_MS = 4000;

/**
 * A generator's HTML: this version from the device when it was opened or downloaded before,
 * else Storage. With no connection (or one that doesn't answer), any saved version opens
 * rather than nothing. Opening a downloaded generator online keeps its offline copy current.
 */
export async function fetchAppHtml(app: SuiteApp): Promise<string> {
  const path = app.htmlPath as string;
  const version = app.updatedAt;
  const cache = await openGeneratorCache();
  const key = cacheKey(path, version);
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit.text();

  const saved = await readOfflineApp(app.id).catch(() => null);
  if (saved && saved.meta.version === version) return saved.html;
  const deviceCopy = saved?.html ?? (await anyOpenedVersion(cache, path).catch(() => null));

  // Offline, a Storage request would first spend ~25 s failing to refresh the session.
  if (!isOnline()) {
    if (deviceCopy !== null) return deviceCopy;
    throw new OfflineUnavailableError();
  }

  const keep = (html: string) => {
    if (saved) {
      // Downloaded before: replace the offline copy with this version.
      void saveOfflineApp(app, html).catch(() => undefined);
    } else if (cache) {
      void (async () => {
        // Drop older versions of the same generator, then keep this one.
        const stale = (await cache.keys()).filter((r) => r.url.startsWith(cachePrefix(path)));
        await Promise.all(stale.map((r) => cache.delete(r)));
        await cache.put(key, new Response(html, { headers: { 'content-type': 'text/html' } }));
      })().catch(() => undefined);
    }
  };
  const network = downloadAppHtml(path).then((html) => {
    keep(html); // also when the device copy already won the race below
    return html;
  });

  if (deviceCopy === null) {
    try {
      return await network;
    } catch (error) {
      if (error instanceof LockedGeneratorError || isOnline()) throw error;
      throw new OfflineUnavailableError();
    }
  }
  // An older copy is on the device: the network's answer if it comes quickly, else the copy.
  return Promise.race([
    network.catch((error: unknown) => {
      if (error instanceof LockedGeneratorError) throw error;
      return deviceCopy;
    }),
    new Promise<string>((resolve) => setTimeout(() => resolve(deviceCopy), SLOW_NETWORK_MS)),
  ]);
}

/** Downloads a generator's HTML. Storage RLS refuses pro-tier files to Free accounts. */
export async function downloadAppHtml(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(HTML_BUCKET).download(path);
  if (error) {
    // Storage answers "not found" for objects the caller's policy can't see.
    if (
      /not found|400|404/i.test(`${error.message} ${'status' in error ? String(error.status) : ''}`)
    ) {
      throw new LockedGeneratorError();
    }
    throw error;
  }
  return data.text();
}

/**
 * File sizes of the generators this account may download (Storage lists only the objects its
 * policy lets the caller read), keyed by html_path.
 */
export async function listAppHtmlSizes(): Promise<Map<string, number>> {
  const { data, error } = await supabase.storage
    .from(HTML_BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const sizes = new Map<string, number>();
  for (const file of data) {
    const size = Number((file.metadata as { size?: number } | null)?.size ?? 0);
    if (file.id && size > 0) sizes.set(file.name, size);
  }
  return sizes;
}

function coverExtension(file: File): string {
  const fromType = file.type.split('/')[1];
  if (fromType && ['jpeg', 'png', 'webp', 'gif'].includes(fromType)) {
    return fromType === 'jpeg' ? 'jpg' : fromType;
  }
  return 'jpg';
}

/** Creates or updates a catalog entry, uploading its generator HTML and cover if given. */
export async function saveApp(draft: AppDraft, existing: SuiteApp | null): Promise<string> {
  const id = existing?.id ?? `app-${crypto.randomUUID()}`;
  const integrated = draft.kind === 'integrated';

  let htmlPath = integrated ? (existing?.htmlPath ?? null) : null;
  if (integrated && draft.html) {
    htmlPath = `${id}.html`;
    const { error } = await supabase.storage
      .from(HTML_BUCKET)
      .upload(htmlPath, new Blob([draft.html], { type: 'text/html' }), {
        upsert: true,
        contentType: 'text/html',
      });
    if (error) throw error;
  }
  if (integrated && !htmlPath) throw new Error(t().form.htmlRequired);

  let coverPath = existing?.coverPath ?? null;
  if (draft.coverFile) {
    const nextPath = `${id}.${coverExtension(draft.coverFile)}`;
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(nextPath, draft.coverFile, { upsert: true, contentType: draft.coverFile.type });
    if (error) throw error;
    if (coverPath && coverPath !== nextPath) {
      await supabase.storage.from(COVER_BUCKET).remove([coverPath]);
    }
    coverPath = nextPath;
  }

  const row: TablesInsert<'apps'> = {
    id,
    name: draft.name.trim(),
    category: draft.category,
    modality: draft.modality.trim(),
    status: draft.status,
    tier: draft.tier,
    badge: draft.badge.trim() || null,
    description: draft.description.trim(),
    duplicate_of: draft.duplicateOf.trim() || null,
    kind: draft.kind,
    external_url: integrated ? null : draft.externalUrl.trim(),
    html_path: htmlPath,
    cover_path: coverPath,
  };

  if (existing) {
    const { error } = await supabase.from('apps').update(row).eq('id', id);
    if (error) throw error;
    // Switched from a hosted generator to an external link → drop the orphaned HTML.
    if (!integrated && existing.htmlPath) {
      await supabase.storage.from(HTML_BUCKET).remove([existing.htmlPath]);
    }
  } else {
    // New entries lead the "recommended" order, as custom apps did in the legacy suite.
    const { error } = await supabase.from('apps').insert({ ...row, sort_order: 0 });
    if (error) throw error;
  }
  return id;
}

export async function deleteApp(app: SuiteApp): Promise<void> {
  const { error } = await supabase.from('apps').delete().eq('id', app.id);
  if (error) throw error;
  // Best-effort cleanup; favorites cascade and hero covers fall back in the database.
  if (app.htmlPath) await supabase.storage.from(HTML_BUCKET).remove([app.htmlPath]);
  if (app.coverPath) await supabase.storage.from(COVER_BUCKET).remove([app.coverPath]);
}
