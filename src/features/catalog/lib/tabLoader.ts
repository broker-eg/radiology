import { queryClient } from '@/lib/queryClient';
import type { SuiteApp } from '@/types/domain';
import { fetchAppHtml } from '../api/catalogService';
import { catalogKeys } from '../hooks/useCatalog';

/** Loads a generator's HTML through the shared query cache (no refetch if already open). */
export function fetchAppHtmlForTab(app: SuiteApp): Promise<string> {
  return queryClient.fetchQuery({
    queryKey: catalogKeys.html(app.id, app.htmlPath, app.updatedAt),
    queryFn: () => fetchAppHtml(app.htmlPath as string, app.updatedAt),
    staleTime: Infinity,
  });
}
