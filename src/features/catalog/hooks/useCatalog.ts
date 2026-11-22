import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/authContext';
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
      toast.info(favorite ? 'Added to favorites' : 'Removed from favorites'),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** The generator's HTML, cached for the session (keyed by the app's last update). */
export function useAppHtml(app: SuiteApp | null, enabled: boolean) {
  return useQuery({
    queryKey: catalogKeys.html(app?.id ?? '', app?.htmlPath ?? null, app?.updatedAt ?? ''),
    queryFn: () => fetchAppHtml(app?.htmlPath as string),
    enabled: enabled && !!app?.htmlPath,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
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
      toast.info(`Deleted ${app.name}`);
      void qc.invalidateQueries({ queryKey: catalogKeys.apps });
      void qc.invalidateQueries({ queryKey: ['favorites'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
