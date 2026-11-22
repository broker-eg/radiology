import { supabase } from '@/lib/supabase';
import type { AdminUser, Plan, Role } from '@/types/domain';

// Admin RPCs are SECURITY DEFINER and refuse non-admins themselves; the UI gate is cosmetic.

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return data.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name ?? null,
    role: u.role as Role,
    plan: u.plan as Plan,
    planChangedAt: u.plan_changed_at ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    favoritesCount: Number(u.favorites_count ?? 0),
  }));
}

export async function setUserPlan(userId: string, plan: Plan): Promise<void> {
  const { error } = await supabase.rpc('admin_set_plan', { target_user: userId, new_plan: plan });
  if (error) throw error;
}

/** Deletes the account (and, by cascade, its profile and favorites). Admins and self refused. */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target_user: userId });
  if (error) throw error;
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { target_user: userId, new_role: role });
  if (error) throw error;
}
