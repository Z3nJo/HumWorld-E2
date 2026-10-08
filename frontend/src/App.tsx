import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell/AppShell';
import { DictionaryPage } from './pages/Dictionary/DictionaryPage';
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
        path: '*',
        element: <Navigate to="/dictionary" replace />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
