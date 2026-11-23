import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { DictionaryPage } from './pages/Dictionary/DictionaryPage';
import { ParametersPage } from './pages/Parameters/ParametersPage';
import { SourcesPage } from './pages/Sources/SourcesPage';
import { LandingPage } from './features/landing/presentation/LandingPage';

const ClerkAuthLayout = lazy(() => import('./features/auth/presentation/ClerkAuthLayout').then(
  (module) => ({ default: module.ClerkAuthLayout }),
));
const ProtectedRoute = lazy(() => import('./features/auth/presentation/ProtectedRoute').then(
  (module) => ({ default: module.ProtectedRoute }),
));
const SignInPage = lazy(() => import('./features/auth/presentation/SignInPage').then(
  (module) => ({ default: module.SignInPage }),
));
const AppShell = lazy(() => import('./components/AppShell/AppShell').then(
  (module) => ({ default: module.AppShell }),
));

function AuthChunk({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div role="status">Cargando acceso…</div>}>{children}</Suspense>;
}

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <AuthChunk><ClerkAuthLayout /></AuthChunk>,
    children: [
      {
        path: 'sign-in/*',
        element: <AuthChunk><SignInPage /></AuthChunk>,
      },
      {
        element: <AuthChunk><ProtectedRoute /></AuthChunk>,
        children: [
          {
            element: <AuthChunk><AppShell /></AuthChunk>,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'dictionary', element: <DictionaryPage /> },
              { path: 'fuentes', element: <SourcesPage /> },
              { path: 'parametros', element: <ParametersPage /> },
              { path: '*', element: <Navigate to="/dictionary" replace /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
