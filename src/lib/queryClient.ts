import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

export const queryClient = new QueryClient({
  // Every failed write says so — a mutation whose UI already shows its error inline opts
  // out with `meta: { toast: false }`.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.toast === false) return;
      toast.error(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
