import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { SuitePage } from '@/features/catalog/routes/SuitePage';
import { CoachTour } from '@/features/onboarding/components/CoachTour';
import { useT } from '@/lib/i18n';

// Only admins ever open the user portal — keep it out of everyone else's first load.
const AdminPage = lazy(() =>
  import('@/features/admin/routes/AdminPage').then((m) => ({ default: m.AdminPage })),
);

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { profile, isLoading } = useProfile();
  if (isLoading) return <FullScreenLoader />;
  return profile?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const t = useT();
  const { session, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <AuthScreen />;

  // HashRouter: GitHub Pages serves one index.html, so routes live after the #.
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SuitePage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Suspense fallback={<FullScreenLoader label={t.brand.loadingUsers} />}>
                <AdminPage />
              </Suspense>
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CoachTour />
    </HashRouter>
  );
}
