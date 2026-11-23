import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/authContext';
import { listAppHtmlSizes } from '@/features/catalog/api/catalogService';
import { t } from '@/lib/i18n';
import { useOnline } from '@/lib/network';
import { toast } from '@/lib/toast';
import type { OfflineApp, SuiteApp } from '@/types/domain';
import {
  listOfflineApps,
  readOfflineApp,
  removeOfflineApp,
  storageEstimate,
} from '../api/offlineStore';
import { inlineVendorResources } from '../api/vendorStore';
import { offlineKeys, warmVendorResources } from '../lib/downloads';
import { htmlFileName } from '../lib/format';

/**
 * Can this device reach Supabase right now? Offline, or online with a session that couldn't be
 * refreshed (a dead connection), downloads would only fail.
 */
export function useConnected(): boolean {
  const online = useOnline();
  const { offline } = useAuth();
  return online && !offline;
}

const toMap = (list: OfflineApp[]) => new Map(list.map((e) => [e.appId, e]));

/** Generators saved on this device. Local reads: they run with or without a connection. */
export function useOfflineLibrary() {
  return useQuery({
    queryKey: offlineKeys.library,
    queryFn: listOfflineApps,
    networkMode: 'always',
    staleTime: 0,
  });
}

/** The same list keyed by app id, for "is this one saved?" checks. */
export function useOfflineMap() {
  return useQuery({
    queryKey: offlineKeys.library,
    queryFn: listOfflineApps,
    networkMode: 'always',
    staleTime: 0,
    select: toMap,
  });
}

export function useStorageEstimate() {
  return useQuery({
    queryKey: offlineKeys.storage,
    queryFn: storageEstimate,
    networkMode: 'always',
    staleTime: 0,
  });
}

/** What each downloadable generator weighs (only files this account may open are listed). */
export function useDownloadSizes(enabled: boolean) {
  return useQuery({
    queryKey: offlineKeys.sizes,
    queryFn: listAppHtmlSizes,
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function useRemoveOffline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: OfflineApp[]) => {
      await Promise.all(entries.map((e) => removeOfflineApp(e.appId)));
      return entries;
    },
    onSuccess: (entries) => {
      const gone = new Set(entries.map((e) => e.appId));
      qc.setQueryData<OfflineApp[]>(offlineKeys.library, (list = []) =>
        list.filter((e) => !gone.has(e.appId)),
      );
      void qc.invalidateQueries({ queryKey: offlineKeys.storage });
      const [first] = entries;
      if (entries.length === 1 && first) toast.info(t().offline.removedOne(first.name));
      else toast.info(t().offline.removedMany(entries.length));
    },
  });
}

/**
 * Saves a downloaded generator as a standalone .html file (Downloads / Files): it opens in any
 * browser, with no account and no connection — its CDN files are written into the page.
 */
export function useSaveFile() {
  return useMutation({
    mutationFn: async (entry: OfflineApp) => {
      const saved = await readOfflineApp(entry.appId);
      if (!saved) throw new Error(t().offline.missing);
      const html = await inlineVendorResources(saved.html);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = htmlFileName(entry.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}

/**
 * Keeps downloads in line with the account: drops generators that left the catalog, stopped
 * running in the suite, or are no longer on the person's plan, and makes sure the CDN files
 * the rest need are on the device. Runs only on fresh data (never on the offline copy of the
 * catalog or profile).
 */
export function useOfflineHousekeeping(
  apps: SuiteApp[],
  canLaunch: (app: SuiteApp) => boolean,
  fresh: boolean,
) {
  const qc = useQueryClient();
  const { data: saved } = useOfflineLibrary();
  const removing = useRef(new Set<string>());
  useEffect(() => {
    if (!fresh || !saved?.length) return;
    const byId = new Map(apps.map((a) => [a.id, a]));
    const stale = saved.filter((e) => {
      if (removing.current.has(e.appId)) return false;
      const app = byId.get(e.appId);
      return !app || app.kind !== 'integrated' || !app.htmlPath || !canLaunch(app);
    });
    const staleIds = new Set(stale.map((e) => e.appId));
    void warmVendorResources(saved.filter((e) => !staleIds.has(e.appId)));
    if (!stale.length) return;
    stale.forEach((e) => removing.current.add(e.appId));
    void Promise.all(stale.map((e) => removeOfflineApp(e.appId).catch(() => undefined))).then(
      () => {
        const gone = new Set(stale.map((e) => e.appId));
        qc.setQueryData<OfflineApp[]>(offlineKeys.library, (list = []) =>
          list.filter((e) => !gone.has(e.appId)),
        );
        void qc.invalidateQueries({ queryKey: offlineKeys.storage });
        toast.info(t().offline.pruned(stale.length));
      },
    );
  }, [apps, canLaunch, fresh, saved, qc]);
}
