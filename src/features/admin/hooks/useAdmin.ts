import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import type { AdminUser, Plan, Role } from '@/types/domain';
import { listUsers, setUserPlan, setUserRole } from '../api/adminService';

const usersKey = ['admin', 'users'] as const;

export function useAdminUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: listUsers,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useSetPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, plan }: { user: AdminUser; plan: Plan }) => setUserPlan(user.id, plan),
    onSuccess: (_d, { user, plan }) => {
      toast.info(`${user.fullName ?? user.email} is now on ${plan === 'pro' ? 'Pro' : 'Free'}`);
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, role }: { user: AdminUser; role: Role }) => setUserRole(user.id, role),
    onSuccess: (_d, { user, role }) => {
      toast.info(
        `${user.fullName ?? user.email} is ${role === 'admin' ? 'now an admin' : 'no longer an admin'}`,
      );
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}
