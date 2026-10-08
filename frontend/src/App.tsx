import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell/AppShell';

const InitialPage = () => (
  <section style={{ padding: '28px' }}>
    <h1>HumWorld</h1>
    <p>La pantalla correspondiente se incorporará en una entrega posterior.</p>
  </section>
);

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
        element: <InitialPage />,
      },
      {
        path: '*',
        element: <InitialPage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
