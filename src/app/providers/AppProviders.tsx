import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Toaster } from '@/components/Toaster';
import { AuthProvider } from './AuthProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <InstallPrompt />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
