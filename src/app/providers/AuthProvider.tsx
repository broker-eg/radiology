import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearGeneratorCache } from '@/features/catalog/api/catalogService';
import { clearOfflineApps } from '@/features/offline/api/offlineStore';
import { clearPersistedQueries } from '@/lib/persistQueries';
import { readStoredSession, supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { AuthContext, type AuthState } from './authContext';

// A connection that neither works nor fails ("lie-fi") gets this long before the suite opens
// from the saved session instead.
const SLOW_AUTH_MS = 4000;

/** No live session but one still saved on the device → signed in, offline. */
function resolve(session: Session | null): AuthState {
  if (session) return { session, loading: false, offline: false };
  const stored = readStoredSession();
  return stored
    ? { session: stored, loading: false, offline: true }
    : { session: null, loading: false, offline: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, offline: false });

  useEffect(() => {
    let active = true;
    let settled = false;
    const apply = (session: Session | null) => {
      if (!active) return;
      settled = true;
      setState(resolve(session));
    };

    // Offline with an expired access token, supabase-js retries the refresh for ~25 s before
    // answering. Don't hold the person on a spinner: open the suite from the saved session.
    const openFromDevice = () => {
      if (!active || settled) return;
      const stored = readStoredSession();
      if (stored) setState({ session: stored, loading: false, offline: true });
    };
    if (!navigator.onLine) openFromDevice();
    const slow = setTimeout(openFromDevice, SLOW_AUTH_MS);

    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Another account must never see the previous one's cached profile, favorites or
      // generators — in memory or on the device. That includes offline downloads.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        clearPersistedQueries();
        void clearGeneratorCache();
        void clearOfflineApps();
      }
      apply(session);
    });

    // Back online: refresh the saved session now rather than at the next auto-refresh tick.
    const onOnline = () => void supabase.auth.getSession().then(({ data }) => apply(data.session));
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      clearTimeout(slow);
      window.removeEventListener('online', onOnline);
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
