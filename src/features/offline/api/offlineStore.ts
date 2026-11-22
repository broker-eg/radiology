import { t } from '@/lib/i18n';
import type { OfflineApp, SuiteApp } from '@/types/domain';

// Generators the person chose to keep for offline use. Cache Storage, one entry per app,
// with its catalog details in a header so the Offline page can list them with no connection
// (and no catalog). Only files Storage already served to this account land here; signing out
// clears it (AuthProvider). The service worker keeps this cache across its own updates.
//
// The automatic "opened recently" cache (catalogService) is separate: it holds only the latest
// version of whatever was opened and is never listed. Downloads are explicit and stay put.
const OFFLINE_CACHE = 'radiology-offline-v1';
const META_HEADER = 'x-offline-meta';
const PREFIX = '/__offline/';

function keyFor(appId: string): string {
  return `${location.origin}${PREFIX}${encodeURIComponent(appId)}`;
}

async function openStore(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(OFFLINE_CACHE) : null;
  } catch {
    return null; // private mode / storage disabled
  }
}

function readMeta(response: Response): OfflineApp | null {
  try {
    const raw = response.headers.get(META_HEADER);
    return raw ? (JSON.parse(decodeURIComponent(raw)) as OfflineApp) : null;
  } catch {
    return null;
  }
}

export function offlineSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** Everything saved on this device, newest first. */
export async function listOfflineApps(): Promise<OfflineApp[]> {
  const store = await openStore();
  if (!store) return [];
  const keys = await store.keys();
  const entries = await Promise.all(
    keys.map(async (req) => {
      const res = await store.match(req);
      return res ? readMeta(res) : null;
    }),
  );
  return entries
    .filter((e): e is OfflineApp => e !== null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** A saved generator's HTML and details, or null when it isn't on this device. */
export async function readOfflineApp(
  appId: string,
): Promise<{ html: string; meta: OfflineApp } | null> {
  const store = await openStore();
  const res = await store?.match(keyFor(appId)).catch(() => undefined);
  const meta = res ? readMeta(res) : null;
  if (!res || !meta) return null;
  return { html: await res.text(), meta };
}

/** Saves (or replaces) a generator's HTML for offline use. */
export async function saveOfflineApp(app: SuiteApp, html: string): Promise<OfflineApp> {
  const store = await openStore();
  if (!store) throw new Error(t().offline.unsupported);
  const meta: OfflineApp = {
    appId: app.id,
    name: app.name,
    category: app.category,
    modality: app.modality,
    badge: app.badge,
    tier: app.tier,
    htmlPath: app.htmlPath as string,
    coverUrl: app.coverUrl,
    version: app.updatedAt,
    bytes: new Blob([html]).size,
    savedAt: new Date().toISOString(),
  };
  await store.put(
    keyFor(app.id),
    new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        [META_HEADER]: encodeURIComponent(JSON.stringify(meta)),
      },
    }),
  );
  return meta;
}

export async function removeOfflineApp(appId: string): Promise<void> {
  const store = await openStore();
  await store?.delete(keyFor(appId));
}

export async function clearOfflineApps(): Promise<void> {
  try {
    if ('caches' in window) await caches.delete(OFFLINE_CACHE);
  } catch {
    /* nothing saved */
  }
}

/**
 * Asks the browser not to evict this site's storage under pressure (Chrome grants it to
 * installed or engaged sites; Safari decides on its own). Best effort.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** How much this site stores on the device, and how much the browser allows. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return quota > 0 ? { usage, quota } : null;
  } catch {
    return null;
  }
}

/**
 * Puts a generator's cover in the service worker's cover cache (it caches the public cover
 * bucket on every fetch), so the offline list shows real thumbnails.
 */
export function warmCover(url: string | null): void {
  if (!url) return;
  void fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => undefined);
}
