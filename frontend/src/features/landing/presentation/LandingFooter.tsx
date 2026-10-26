import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { PANEL_PATH } from './paths';
import './LandingFooter.css';

const REPO_URL = 'https://github.com/Z3nJo/HumWorld-E2';

const LINKS = [
  { href: '#que-es', label: 'Qué es' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#que-veras', label: 'Qué verás' },
  { href: '#alcance', label: 'Alcance' },
];

export const LandingFooter = () => (
  <footer className="lp-footer">
    <div className="lp-container lp-footer__inner">
      <div className="lp-footer__cta-row">
        <h2 className="lp-footer__title">Mira cómo amanece hoy el mundo.</h2>
        <div className="lp-footer__connect">
          <span>Abre el panel de humor</span>
          <Link to={PANEL_PATH} className="lp-btn lp-btn--light">Ir al panel →</Link>
        </div>
      </div>
      <nav aria-label="Pie de página" className="lp-footer__links">
        {LINKS.map(({ href, label }) => (
          <a key={href} href={href}>{label}</a>
        ))}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Repositorio en GitHub ↗
        </a>
      </nav>
      <div className="lp-footer__meta">
        <div className="lp-footer__credit">
          <Logo size={16} />
          <span>Proyecto final · Uso de IA en Ingeniería de Software · Universidad Andrés Bello</span>
        </div>
        <span>© 2026 HumWorld</span>
      </div>
    </div>
  </footer>
);
