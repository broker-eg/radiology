import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { Plan, Profile, Role } from '@/types/domain';

function toProfile(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as Role,
    plan: row.plan as Plan,
    planChangedAt: row.plan_changed_at,
    heroAppId: row.hero_app_id,
    onboardedAt: row.onboarded_at,
    createdAt: row.created_at,
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Returns true when the account is active immediately, false when email confirmation is pending. */
export async function signUp(email: string, password: string, fullName: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return data.session !== null;
}

export async function signOut(): Promise<void> {
  // Offline there's no server to revoke the session with: sign this device out locally. It
  // still clears everything saved for the account (SIGNED_OUT); the "couldn't refresh" error
  // supabase-js reports alongside is expected then.
  const online = navigator.onLine;
  const { error } = await supabase.auth.signOut(online ? undefined : { scope: 'local' });
  if (error && online) throw error;
}

export async function setHeroApp(userId: string, appId: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ hero_app_id: appId }).eq('id', userId);
  if (error) throw error;
}

export async function markOnboarded(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
