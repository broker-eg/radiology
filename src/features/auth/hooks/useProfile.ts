import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/authContext';
import { fetchProfile, setHeroApp, signOut } from '../api/authService';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: profileKey(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });
  const profile = query.data ?? null;
  const isAdmin = profile?.role === 'admin';
  return {
    profile,
    userId,
    email: session?.user.email ?? profile?.email ?? '',
    isAdmin,
    /** Pro plan or admin: may launch every generator. */
    hasPro: isAdmin || profile?.plan === 'pro',
    isLoading: query.isLoading,
  };
}

export function useSetHeroApp() {
  const qc = useQueryClient();
  const { userId } = useProfile();
  return useMutation({
    mutationFn: (appId: string | null) => setHeroApp(userId as string, appId),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}
