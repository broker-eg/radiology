import { createClient, type Session } from '@supabase/supabase-js';
import { env } from '@/app/config/env';
import type { Database } from '@/types/database';

// The only sanctioned supabase-js entry point: features/*/api import from here,
// components/hooks must not (ESLint-enforced).
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// supabase-js's default storage key (we don't override it: changing it would sign everyone out).
const STORAGE_KEY = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

/**
 * The session supabase-js keeps on this device, read without touching the network. When the
 * access token has expired and the device is offline, getSession() spends ~25 s retrying the
 * refresh and then answers "no session" — yet the session stays stored (supabase-js removes it
 * only when the server rejects it, or on sign-out). Its presence means "signed in, offline".
 */
export function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<Session> | null;
    return session?.access_token && session.refresh_token && session.user?.id
      ? (session as Session)
      : null;
  } catch {
    return null;
  }
}
