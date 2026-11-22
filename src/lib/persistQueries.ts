import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query';

// Returning visits paint the catalog straight away: the small, slow-changing queries
// (catalog, categories, the signed-in profile and favorites) are kept in localStorage and
// restored before the first render. They are still refetched in the background, so the screen
// settles on fresh data a moment later. Generator HTML is never stored here (too large; it has
// its own device cache). Signing out wipes it.
const KEY = 'radiology:query-cache';
const VERSION = 1;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const PERSISTED = new Set(['apps', 'categories', 'profile', 'favorites']);

export function restoreQueries(client: QueryClient) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { v: number; at: number; state: DehydratedState };
    if (saved.v !== VERSION || Date.now() - saved.at > MAX_AGE) {
      localStorage.removeItem(KEY);
      return;
    }
    hydrate(client, saved.state);
  } catch {
    /* a broken entry just means a normal cold start */
  }
}

export function persistQueries(client: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    try {
      const state = dehydrate(client, {
        shouldDehydrateQuery: (q) =>
          q.state.status === 'success' && PERSISTED.has(String(q.queryKey[0])),
      });
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, at: Date.now(), state }));
    } catch {
      /* storage full or unavailable: the next visit loads from the network */
    }
  };
  return client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' && event.type !== 'removed') return;
    clearTimeout(timer);
    timer = setTimeout(save, 600);
  });
}

export function clearPersistedQueries() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
