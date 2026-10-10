import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell/AppShell';
import { DictionaryPage } from './pages/Dictionary/DictionaryPage';
import { SourcesPage } from './pages/Sources/SourcesPage';
import { LandingPage } from './features/landing/presentation/LandingPage';

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <AppShell />,
    children: [
      {
        path: 'dictionary',
        element: <DictionaryPage />,
      },
      {
        path: 'fuentes',
        element: <SourcesPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dictionary" replace />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
