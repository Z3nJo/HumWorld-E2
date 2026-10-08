import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import './LandingFooter.css';

const REPO_URL = 'https://github.com/Z3nJo/HumWorld-E2';

export const LandingFooter = () => (
  <footer className="lp-footer">
    <div className="lp-container lp-footer__inner">
      <div className="lp-footer__cta-row">
        <h2 className="lp-footer__title">Mira cómo amanece hoy el mundo.</h2>
        <Link to="/dashboard" className="lp-btn lp-btn--light">Ir al panel →</Link>
      </div>
      <div className="lp-footer__meta">
        <div className="lp-footer__credit">
          <Logo size={18} />
          <span>
            Proyecto final · Uso de IA en Ingeniería de Software · Universidad Andrés Bello · 2026
          </span>
        </div>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="lp-footer__repo">
          Repositorio en GitHub ↗
        </a>
      </div>
    </div>
  </footer>
);
