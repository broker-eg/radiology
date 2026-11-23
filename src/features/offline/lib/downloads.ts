import { useSyncExternalStore } from 'react';
import { downloadAppHtml } from '@/features/catalog/api/catalogService';
import { t } from '@/lib/i18n';
import { isOnline } from '@/lib/network';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/lib/toast';
import type { OfflineApp, SuiteApp } from '@/types/domain';
import {
  readOfflineApp,
  requestPersistentStorage,
  saveOfflineApp,
  warmCover,
} from '../api/offlineStore';
import { cacheVendorResources } from '../api/vendorStore';
import { formatBytes } from './format';

export const offlineKeys = {
  library: ['offline-library'] as const,
  storage: ['offline-storage'] as const,
  sizes: ['offline-sizes'] as const,
};

// One download queue for the whole app (module state, not component state): a batch keeps
// going, and its progress stays visible, while the person moves between pages. Three files at
// a time — generators are 60 KB to 1.5 MB.
const CONCURRENCY = 3;

export interface DownloadProgress {
  /** Queued or downloading right now. */
  pending: ReadonlySet<string>;
  /** The current batch (resets once the queue drains). */
  total: number;
  done: number;
  failed: number;
  bytes: number;
}

const IDLE: DownloadProgress = { pending: new Set(), total: 0, done: 0, failed: 0, bytes: 0 };
let progress: DownloadProgress = IDLE;
const queue: SuiteApp[] = [];
let running = 0;
const listeners = new Set<() => void>();

function update(patch: Partial<DownloadProgress>) {
  progress = { ...progress, ...patch };
  listeners.forEach((l) => l());
}

function withoutId(id: string): Set<string> {
  const next = new Set(progress.pending);
  next.delete(id);
  return next;
}

function remember(entry: OfflineApp) {
  // Patch the list in place when it's loaded (69 refetches would flicker); else load it.
  if (queryClient.getQueryData(offlineKeys.library)) {
    queryClient.setQueryData<OfflineApp[]>(offlineKeys.library, (list = []) => [
      entry,
      ...list.filter((e) => e.appId !== entry.appId),
    ]);
  } else {
    void queryClient.invalidateQueries({ queryKey: offlineKeys.library });
  }
}

// Saved versions whose CDN files (Tailwind, icons, fonts…) are known to be on the device.
const VENDOR_READY_KEY = 'radiology:vendor-ready';
const readyKey = (e: { appId: string; version: string }) => `${e.appId}@${e.version}`;

function readVendorReady(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VENDOR_READY_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeVendorReady(keys: Set<string>) {
  try {
    localStorage.setItem(VENDOR_READY_KEY, JSON.stringify([...keys]));
  } catch {
    /* only saves a re-check */
  }
}

let warming = false;

/**
 * Generators downloaded before their CDN files were kept on the device open unstyled offline:
 * fetch those files once while online. Each saved version is checked once.
 */
export async function warmVendorResources(entries: OfflineApp[]): Promise<void> {
  if (warming || !isOnline()) return;
  warming = true;
  try {
    const current = new Set(entries.map(readyKey));
    const ready = new Set([...readVendorReady()].filter((k) => current.has(k)));
    for (const entry of entries) {
      if (ready.has(readyKey(entry)) || !isOnline()) continue;
      const saved = await readOfflineApp(entry.appId).catch(() => null);
      if (saved && (await cacheVendorResources(saved.html))) ready.add(readyKey(entry));
    }
    writeVendorReady(ready);
  } finally {
    warming = false;
  }
}

async function downloadOne(app: SuiteApp) {
  try {
    const html = await downloadAppHtml(app.htmlPath as string);
    const entry = await saveOfflineApp(app, html);
    // What makes it open styled offline: Tailwind, icons, Word export, fonts.
    if (await cacheVendorResources(html).catch(() => false)) {
      writeVendorReady(readVendorReady().add(readyKey(entry)));
    }
    remember(entry);
    warmCover(app.coverUrl);
    update({
      pending: withoutId(app.id),
      done: progress.done + 1,
      bytes: progress.bytes + entry.bytes,
    });
  } catch {
    update({ pending: withoutId(app.id), failed: progress.failed + 1 });
  }
}

function finishBatch() {
  const { done, failed, bytes, total } = progress;
  void queryClient.invalidateQueries({ queryKey: offlineKeys.storage });
  if (failed) toast.error(t().offline.batchFailed(failed, total));
  else if (total > 1) toast.info(t().offline.batchDone(done, formatBytes(bytes)));
  else if (done === 1) toast.info(t().offline.savedOne);
  progress = { ...IDLE, pending: new Set() };
  listeners.forEach((l) => l());
}

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const app = queue.shift() as SuiteApp;
    running += 1;
    void downloadOne(app).finally(() => {
      running -= 1;
      if (running === 0 && queue.length === 0) finishBatch();
      else pump();
    });
  }
}

/** Saves generators on this device (skips ones already queued). Returns how many were queued. */
export function downloadApps(apps: SuiteApp[]): number {
  const fresh = apps.filter(
    (a) => a.kind === 'integrated' && !!a.htmlPath && !progress.pending.has(a.id),
  );
  if (!fresh.length) return 0;
  void requestPersistentStorage();
  queue.push(...fresh);
  update({
    pending: new Set([...progress.pending, ...fresh.map((a) => a.id)]),
    total: progress.total + fresh.length,
  });
  pump();
  return fresh.length;
}

/** Stops the batch: queued files are dropped, the ones already downloading finish. */
export function cancelDownloads() {
  const dropped = queue.splice(0, queue.length);
  if (!dropped.length) return;
  const pending = new Set(progress.pending);
  dropped.forEach((a) => pending.delete(a.id));
  update({ pending, total: progress.total - dropped.length });
}

export function useDownloadProgress(): DownloadProgress {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => progress,
  );
}
