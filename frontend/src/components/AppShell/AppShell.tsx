import { NavLink, Outlet } from 'react-router-dom';
import './AppShell.css';

export const AppShell = () => {
  return (
    <div className="app">
      <aside className="nav">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M13 1a12 12 0 0 0 0 24z" fill="#d86a3c" />
            <path d="M13 1a12 12 0 0 1 0 24z" fill="#5d8fd0" />
          </svg>
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
            onClick={(e) => {
              // placeholder
              if (window.location.pathname === '/') e.preventDefault();
            }}
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
          <NavLink
            to="/operaciones"
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            Captura y borrado<span>manual</span>
          </NavLink>
        </nav>

        <div className="navfoot">
          API <code>/api/v1</code><br />
          Contrato <code>/api/docs</code><br />
          Prototipo · datos de ejemplo
        </div>
      </aside>

      <main>
        <div className="authbar">
          <i aria-hidden="true" />
          <span>
            <b>Entorno sin autenticación.</b> Cualquier persona con acceso a esta URL puede modificar fuentes, diccionario y parámetros.
          </span>
        </div>

        <Outlet />
      </main>
    </div>
  );
};
