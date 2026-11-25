import { StrictMode, useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { http } from '../../../shared/api/httpClient';
import { ProtectedRoute } from './ProtectedRoute';

const clerk = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: false,
  getToken: vi.fn<() => Promise<string | null>>(),
  signOut: vi.fn(),
}));

vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    isLoaded: clerk.isLoaded,
    isSignedIn: clerk.isSignedIn,
    getToken: clerk.getToken,
  }),
  useClerk: () => ({ signOut: clerk.signOut }),
}));

function SignInProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '';
  return <div>Inicio de sesión desde {from}</div>;
}

function ProtectedRequest() {
  return (
    <button type="button" onClick={() => void http.get('/api/v1/config').catch(() => undefined)}>
      Consultar protegido
    </button>
  );
}

function renderProtected(child = <div>Contenido administrativo</div>) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/parametros?seccion=humor']}>
        <Routes>
          <Route path="/sign-in" element={<SignInProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/parametros" element={child} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

function NavigationShell() {
  return (
    <>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/fuentes">Fuentes</Link>
        <Link to="/dictionary">Diccionario</Link>
        <Link to="/parametros">Parámetros</Link>
      </nav>
      <Outlet />
    </>
  );
}

function RequestingScreen({
  name,
  path = '/api/v1/config',
}: {
  name: string;
  path?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void http.get<{ ok: boolean }>(path).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return <div>{name} {ready ? 'lista' : 'cargando'}</div>;
}

function renderProtectedNavigation() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/fuentes']}>
        <Routes>
          <Route path="/sign-in" element={<SignInProbe />} />
          <Route
            path="/dashboard"
            element={<RequestingScreen name="Dashboard" path="/api/v1/dashboards" />}
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<NavigationShell />}>
              <Route path="/fuentes" element={<RequestingScreen name="Fuentes" />} />
              <Route path="/dictionary" element={<RequestingScreen name="Diccionario" />} />
              <Route path="/parametros" element={<RequestingScreen name="Parámetros" />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

beforeEach(() => {
  clerk.isLoaded = true;
  clerk.isSignedIn = false;
  clerk.getToken.mockReset().mockResolvedValue('session-token');
  clerk.signOut.mockReset().mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe('ProtectedRoute', () => {
  it('redirects an anonymous visit and preserves its requested URL', () => {
    renderProtected();

    expect(screen.getByText('Inicio de sesión desde /parametros?seccion=humor')).toBeInTheDocument();
  });

  it('renders the administrative content after preparing the token boundary', async () => {
    clerk.isSignedIn = true;
    renderProtected();

    expect(await screen.findByText('Contenido administrativo')).toBeInTheDocument();
  });

  it('keeps the session and Bearer boundary while navigating every administrative route', async () => {
    clerk.isSignedIn = true;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const user = userEvent.setup();
    renderProtectedNavigation();

    expect(await screen.findByText('Fuentes lista')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Diccionario' }));
    expect(await screen.findByText('Diccionario lista')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Parámetros' }));
    expect(await screen.findByText('Parámetros lista')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByText('Dashboard lista')).toBeInTheDocument();

    expect(clerk.signOut).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    const administrativeCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/config'));
    const dashboardCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/dashboards'));
    expect(administrativeCalls.length).toBeGreaterThan(0);
    expect(dashboardCalls.length).toBeGreaterThan(0);
    for (const [, init] of administrativeCalls) {
      expect((init?.headers as Headers).get('Authorization')).toBe('Bearer session-token');
    }
    for (const [, init] of dashboardCalls) {
      expect((init?.headers as Headers).get('Authorization')).toBeNull();
    }
  });

  it('shows access denied for a 403 without redirect loops', async () => {
    clerk.isSignedIn = true;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'No autorizado' }), { status: 403 }),
    );
    const user = userEvent.setup();
    renderProtected(<ProtectedRequest />);

    await user.click(await screen.findByRole('button', { name: 'Consultar protegido' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta cuenta no administra HumWorld');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('ends an invalid session and redirects a 401 back to sign-in', async () => {
    clerk.isSignedIn = true;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Sesión expirada' }), { status: 401 }),
    );
    const user = userEvent.setup();
    renderProtected(<ProtectedRequest />);

    await user.click(await screen.findByRole('button', { name: 'Consultar protegido' }));

    await waitFor(() => expect(clerk.signOut).toHaveBeenCalledOnce());
    expect(await screen.findByText('Inicio de sesión desde /parametros?seccion=humor')).toBeInTheDocument();
  });
});
