import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../../features/landing/presentation/Logo';
import './AppShell.css';

export const AppShell = () => {
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


      </aside>

      <main>


        <Outlet />
      </main>
    </div>
  );
};
