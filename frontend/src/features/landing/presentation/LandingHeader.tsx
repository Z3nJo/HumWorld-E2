import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { PANEL_PATH } from './paths';
import './LandingHeader.css';

const SECTIONS = [
  { href: '#que-es', label: 'Qué es' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#que-veras', label: 'Qué verás' },
];

export const LandingHeader = () => (
  <header className="lp-header">
    <div className="lp-container lp-header__bar">
      <a href="#inicio" aria-label="HumWorld, inicio" className="lp-header__brand">
        <Logo size={26} />
        <span className="lp-header__name">HumWorld</span>
      </a>
      <nav aria-label="Secciones" className="lp-header__nav">
        {SECTIONS.map(({ href, label }, i) => (
          <Fragment key={href}>
            {i > 0 && <span aria-hidden="true" className="lp-header__sep">·</span>}
            <a href={href} className="lp-header__link">{label}</a>
          </Fragment>
        ))}
      </nav>
      <Link to={PANEL_PATH} className="lp-btn lp-btn--dark lp-header__cta">Ir al panel →</Link>
    </div>
  </header>
);
