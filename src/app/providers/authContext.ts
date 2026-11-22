import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  /**
   * The session is this device's saved copy, which can't be refreshed right now (no
   * connection). The suite runs from what's on the device until the connection returns.
   */
  offline: boolean;
}

export const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  offline: false,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
