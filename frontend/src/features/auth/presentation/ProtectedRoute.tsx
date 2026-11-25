import { useAuth, useClerk } from '@clerk/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { configureHttpAuth } from '../../../shared/api/httpClient';
import './auth.css';

function requestedPath(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

export function ProtectedRoute() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();
  const [httpReady, setHttpReady] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const destination = requestedPath(location.pathname, location.search, location.hash);
  const latestAuth = useRef({ destination, getToken, navigate, signOut });

  useLayoutEffect(() => {
    latestAuth.current = { destination, getToken, navigate, signOut };
  }, [destination, getToken, navigate, signOut]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return undefined;
    }

    let active = true;
    const dispose = configureHttpAuth({
      getToken: () => latestAuth.current.getToken(),
      onUnauthorized: async () => {
        const current = latestAuth.current;
        await current.signOut();
        current.navigate('/sign-in', {
          replace: true,
          state: { from: current.destination },
        });
      },
      onForbidden: () => setForbidden(true),
    });
    queueMicrotask(() => {
      if (active) setHttpReady(true);
    });
    return () => {
      active = false;
      dispose();
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <div className="auth-loading" role="status">Comprobando sesión…</div>;
  }
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: destination }} />;
  }
  if (forbidden) {
    return (
      <main className="auth-page">
        <section className="auth-status" role="alert">
          <span className="auth-status__eyebrow">Acceso denegado</span>
          <h1>Esta cuenta no administra HumWorld</h1>
          <p>La sesión es válida, pero no corresponde a la cuenta configurada.</p>
          <button type="button" onClick={() => void signOut({ redirectUrl: '/dashboard' })}>
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }
  if (!httpReady) {
    return <div className="auth-loading" role="status">Preparando acceso…</div>;
  }

  return <Outlet />;
}
