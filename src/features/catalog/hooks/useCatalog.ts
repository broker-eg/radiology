import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@/app/providers/authContext';
import { t } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import type { AppDraft, SuiteApp } from '@/types/domain';
import {
  addFavorite,
  deleteApp,
  fetchAppHtml,
  listApps,
  listCategories,
  listFavoriteIds,
  removeFavorite,
  saveApp,
} from '../api/catalogService';

export const catalogKeys = {
  categories: ['categories'] as const,
  apps: ['apps'] as const,
  favorites: (userId: string | undefined) => ['favorites', userId] as const,
  html: (appId: string, htmlPath: string | null, version: string) =>
    ['app-html', appId, htmlPath, version] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: listCategories,
    staleTime: 10 * 60_000,
  });
}

export function useApps() {
  return useQuery({ queryKey: catalogKeys.apps, queryFn: listApps });
}

// Module-level so React Query memoizes the Set (an inline select rebuilds it every render).
const toIdSet = (ids: string[]) => new Set(ids);

export function useFavorites() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: catalogKeys.favorites(userId),
    queryFn: listFavoriteIds,
    enabled: !!userId,
    select: toIdSet,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = catalogKeys.favorites(session?.user.id);
  return useMutation({
    mutationFn: ({ appId, favorite }: { appId: string; favorite: boolean }) =>
      favorite ? addFavorite(appId) : removeFavorite(appId),
    // Optimistic: the star flips instantly, and rolls back if the write fails.
    onMutate: async ({ appId, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (ids = []) =>
        favorite ? [...new Set([...ids, appId])] : ids.filter((id) => id !== appId),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSuccess: (_data, { favorite }) =>
      toast.info(favorite ? t().toast.favoriteAdded : t().toast.favoriteRemoved),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// Generator HTML is answered from the device when it's there (downloads, recent opens), so
// it must not wait for a connection: networkMode 'always' lets the service decide.
export function htmlQuery(app: SuiteApp) {
  // The key holds what decides the content (id, file, version); the rest of `app` only labels
  // the offline copy, so it isn't part of the key.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return {
    queryKey: catalogKeys.html(app.id, app.htmlPath, app.updatedAt),
    queryFn: () => fetchAppHtml(app),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
    networkMode: 'always',
  } as const;
}

/** The generator's HTML (memory → this device → Storage), keyed by the app's last update. */
export function useAppHtml(app: SuiteApp, enabled: boolean) {
  return useQuery({ ...htmlQuery(app), enabled: enabled && !!app.htmlPath });
}

/** Starts loading a generator the person is about to launch (hover, focus, details open). */
export function usePrefetchAppHtml(canLaunch: (app: SuiteApp) => boolean) {
  const qc = useQueryClient();
  return useCallback(
    (app: SuiteApp) => {
      if (app.kind !== 'integrated' || !app.htmlPath || !canLaunch(app)) return;
      void qc.prefetchQuery(htmlQuery(app));
    },
    [qc, canLaunch],
  );
}

export function useSaveApp() {
  const qc = useQueryClient();
  return useMutation({
    meta: { toast: false },
    mutationFn: ({ draft, existing }: { draft: AppDraft; existing: SuiteApp | null }) =>
      saveApp(draft, existing),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.apps }),
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (app: SuiteApp) => deleteApp(app),
    onSuccess: (_d, app) => {
      toast.info(t().toast.deleted(app.name));
      void qc.invalidateQueries({ queryKey: catalogKeys.apps });
      void qc.invalidateQueries({ queryKey: ['favorites'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
