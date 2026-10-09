import { Link } from 'react-router-dom';
import { HERO_SAMPLE, HUMOR_STOPS } from '../domain/humorScale';
import { PANEL_PATH } from './paths';
import { useHeartbeat } from './useHeartbeat';
import { MapPulses, WorldMap } from './WorldMap';
import './Hero.css';

const ramp = (stops: typeof HUMOR_STOPS) =>
  `linear-gradient(90deg, ${stops.map(({ color }) => color).join(', ')})`;

const RAMP_FULL = ramp(HUMOR_STOPS);
const RAMP_POSITIVE = ramp(HUMOR_STOPS.filter(({ value }) => value >= 0));

// Separate component so each heartbeat re-renders only the map layers.
// The ripples sit in a twin frame above the veil, so they stay visible over the center.
const HeroMap = () => {
  const values = useHeartbeat(HERO_SAMPLE);
  return (
    <>
      <div aria-hidden="true" className="lp-hero__map">
        <div className="lp-hero__map-frame">
          <WorldMap variant="hero" values={values} />
        </div>
      </div>
      <div aria-hidden="true" className="lp-hero__veil" />
      <div aria-hidden="true" className="lp-hero__map">
        <div className="lp-hero__map-frame lp-hero__pulses">
          <MapPulses values={values} />
        </div>
      </div>
    </>
  );
};

export const Hero = () => (
  <section id="inicio" aria-labelledby="hero-t" className="lp-hero">
    <HeroMap />
    <div className="lp-container lp-hero__inner">
      <div className="lp-eyebrow lp-hero__meta">
        <span>Edición global</span>
        <span aria-hidden="true">·</span>
        <span>Noticias vía RSS</span>
        <span aria-hidden="true">·</span>
        <span>ES / EN</span>
      </div>
      <h1 id="hero-t" className="lp-hero__title">
        ¿De qué <span className="lp-hero__hue">humor</span> está el mundo?
      </h1>
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
        <span className="lp-hero__stop">
          <i className="lp-hero__swatch" style={{ background: 'var(--neg)' }} />
          Negativo <span className="lp-hero__value">−1</span>
        </span>
        <span aria-hidden="true" className="lp-hero__ramp" style={{ background: RAMP_FULL }} />
        <span className="lp-hero__stop">
          <i className="lp-hero__swatch lp-hero__swatch--neu" style={{ background: 'var(--neu)' }} />
          Neutro <span className="lp-hero__value">0</span>
        </span>
        <span aria-hidden="true" className="lp-hero__ramp" style={{ background: RAMP_POSITIVE }} />
        <span className="lp-hero__stop">
          <i className="lp-hero__swatch" style={{ background: 'var(--pos)' }} />
          Positivo <span className="lp-hero__value">+1</span>
        </span>
      </div>
      <p className="lp-hero__caption">Mapa de fondo ilustrativo · valores de ejemplo</p>
    </div>
  </section>
);
