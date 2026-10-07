import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell/AppShell';
import { DictionaryPage } from './pages/Dictionary/DictionaryPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dictionary" replace />,
      },
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
