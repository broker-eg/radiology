import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import type { AdminUser, Plan, Role } from '@/types/domain';
import { deleteUser, listUsers, setUserPlan, setUserRole } from '../api/adminService';

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
      toast.info(t().toast.planChanged(user.fullName ?? user.email, plan === 'pro'));
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, role }: { user: AdminUser; role: Role }) => setUserRole(user.id, role),
    onSuccess: (_d, { user, role }) => {
      toast.info(t().toast.roleChanged(user.fullName ?? user.email, role === 'admin'));
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: AdminUser) => deleteUser(user.id),
    onSuccess: (_d, user) => {
      toast.info(t().toast.userDeleted(user.fullName ?? user.email));
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}
