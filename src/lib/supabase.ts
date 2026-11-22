import { createClient } from '@supabase/supabase-js';
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
