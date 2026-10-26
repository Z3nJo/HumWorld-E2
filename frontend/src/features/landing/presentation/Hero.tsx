import { Link } from 'react-router-dom';
import { HUMOR_STOPS } from '../domain/humorScale';
import { PANEL_PATH } from './paths';
import './Hero.css';

const RAMP = `linear-gradient(90deg, ${HUMOR_STOPS.map(({ color }) => color).join(', ')})`;

// Compact centered stack up top; the particle orb (drawn by GlobeCanvas into the slot)
// rises from below it and runs off the bottom of the viewport.
export const Hero = () => (
  <section id="inicio" aria-labelledby="hero-t" className="lp-hero">
    <div className="lp-container lp-hero__inner">
      <div className="lp-eyebrow">HumWorld</div>
      <h1 id="hero-t" className="lp-hero__title">¿De qué humor está el mundo?</h1>
      <p className="lp-hero__lead">
        HumWorld lee las noticias que publican medios y fuentes oficiales, mide su tono con un
        diccionario de términos y lo resume en un mapa por continente y país.
      </p>
      <div className="lp-hero__actions">
        <Link to={PANEL_PATH} className="lp-btn lp-btn--dark">Explorar el humor global →</Link>
        <a href="#como-funciona" className="lp-btn lp-btn--ghost">Cómo funciona</a>
      </div>
      <div
        role="img"
        aria-label="Escala de humor: de negativo a la izquierda, pasando por neutro, a positivo a la derecha"
        className="lp-hero__legend"
      >
        <span>−1 Negativo</span>
        <span aria-hidden="true" className="lp-hero__ramp" style={{ background: RAMP }} />
        <span>Positivo +1</span>
      </div>
    </div>
    <div aria-hidden="true" data-globe-slot className="lp-hero__orb" />
    <p className="lp-hero__caption">Globo de fondo ilustrativo · valores de ejemplo</p>
  </section>
);
