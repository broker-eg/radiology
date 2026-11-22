import { queryClient } from '@/lib/queryClient';
import type { SuiteApp } from '@/types/domain';
import { htmlQuery } from '../hooks/useCatalog';

/** Loads a generator's HTML through the shared query cache (no refetch if already open). */
export function fetchAppHtmlForTab(app: SuiteApp): Promise<string> {
  return queryClient.fetchQuery(htmlQuery(app));
}
