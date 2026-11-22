import { useEffect, useState, type ReactNode } from 'react';
import { clearGeneratorCache } from '@/features/catalog/api/catalogService';
import { clearPersistedQueries } from '@/lib/persistQueries';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Another account must never see the previous one's cached profile, favorites or
      // generators — in memory or on the device.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        clearPersistedQueries();
        void clearGeneratorCache();
      }
      setState({ session, loading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
