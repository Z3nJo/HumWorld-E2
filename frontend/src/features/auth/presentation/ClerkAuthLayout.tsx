import { ClerkProvider } from '@clerk/react';
import { esES } from '@clerk/localizations';
import { Link, Outlet } from 'react-router-dom';
import './auth.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

export function ClerkAuthLayout() {
  if (!publishableKey) {
    return (
      <main className="auth-page">
        <section className="auth-status" role="alert">
          <span className="auth-status__eyebrow">Acceso administrativo</span>
          <h1>Autenticación no configurada</h1>
          <p>
            Falta la clave pública de Clerk para este ambiente. El landing continúa
            disponible mientras se completa la configuración.
          </p>
          <Link to="/">Volver al landing</Link>
        </section>
      </main>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} localization={esES}>
      <Outlet />
    </ClerkProvider>
  );
}
