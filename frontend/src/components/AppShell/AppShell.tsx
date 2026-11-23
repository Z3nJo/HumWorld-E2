import { useClerk, useUser } from '@clerk/react';
import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../../features/landing/presentation/Logo';
import './AppShell.css';

export const AppShell = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? 'Cuenta administrativa';

  return (
    <div className="app">
      <aside className="nav">
        <div className="brand">
          <Logo size={26} />
          <div>
            <b>HumWorld</b>
            <small>humor de las noticias</small>
          </div>
        </div>

        <nav className="navgrp">
          <h6>Análisis</h6>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            Dashboard de humor<span>4.3.2</span>
          </NavLink>
        </nav>

        <nav className="navgrp">
          <h6>Administración</h6>
          <NavLink
            to="/fuentes"
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            Fuentes y canales<span>RSS</span>
          </NavLink>
          <NavLink
            to="/dictionary"
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            Diccionario<span>es · en</span>
          </NavLink>
          <NavLink
            to="/parametros"
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            Parámetros<span>/config</span>
          </NavLink>
        </nav>


        <div className="navsession">
          <span>Sesión administrativa</span>
          <strong title={email}>{email}</strong>
          <button type="button" onClick={() => void signOut({ redirectUrl: '/' })}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main>


        <Outlet />
      </main>
    </div>
  );
};
