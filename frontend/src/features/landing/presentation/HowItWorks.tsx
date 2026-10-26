import { Link } from 'react-router-dom';
import { HowStory } from './HowStory';
import { PANEL_PATH } from './paths';
import './HowItWorks.css';

type Step = { title: string; text: string; to: string };

const STEPS: Step[] = [
  {
    title: 'Canales RSS',
    text: 'Se leen los canales RSS activos de medios y fuentes oficiales. Solo RSS: no se hace scraping de sitios web.',
    to: '/fuentes',
  },
  {
    title: 'Diccionario de términos',
    text: 'Cada titular y bajada se compara con un diccionario en español e inglés donde cada término tiene un peso positivo o negativo.',
    to: '/dictionary',
  },
  {
    title: 'Valor de humor',
    text: 'La suma ponderada de los términos da a la noticia un valor entre −1 y +1. Las que no tienen términos reconocidos quedan como no evaluables.',
    to: '/parametros',
  },
  {
    title: 'Mapa por continente y país',
    text: 'Los valores se promedian por día y región. Con pocas noticias, el resultado se marca como provisional en lugar de ocultarse.',
    to: PANEL_PATH,
  },
];

// Decorative molecule: white dots, some fused in pairs by a thick bar like a metaball.
const DOTS: [number, number][] = [
  [70, 40], [190, 40], [110, 96], [20, 150], [150, 150], [210, 150], [290, 150], [110, 204], [70, 260], [190, 260],
];
const BONDS: [number, number][] = [[0, 2], [5, 6], [7, 8]];

const Molecule = () => (
  <svg viewBox="-10 0 330 300" aria-hidden="true" className="lp-molecule">
    {BONDS.map(([a, b]) => (
      <line key={`${a}-${b}`} x1={DOTS[a][0]} y1={DOTS[a][1]} x2={DOTS[b][0]} y2={DOTS[b][1]} className="lp-molecule__bond" />
    ))}
    {DOTS.map(([x, y]) => (
      <g key={`${x}-${y}`} className="lp-molecule__atom">
        <circle cx={x} cy={y} r="17" className="lp-molecule__dot" />
        <circle cx={x} cy={y} r="1.6" className="lp-molecule__core" />
      </g>
    ))}
  </svg>
);

export const HowItWorks = () => (
  <section id="como-funciona" aria-labelledby="cf-t" className="lp-section">
    <div className="lp-section__row">
      <div className="lp-eyebrow">Cómo funciona</div>
      <h2 id="cf-t" className="lp-section__title">De un titular a un color en el mapa</h2>
      <p className="lp-section__note">4 pasos · se repite en cada captura</p>
    </div>
    <HowStory />
    <div className="lp-well lp-explore">
      <div className="lp-explore__list">
        <div className="lp-eyebrow">Recorrido</div>
        <h3 className="lp-explore__title">Paso a paso</h3>
        <ol className="lp-steps">
          {STEPS.map(({ title, text, to }, i) => (
            <li key={to}>
              <Link to={to} className="lp-steps__item">
                <span className="lp-steps__head">
                  <span className="lp-steps__title">
                    <span className="lp-steps__num">0{i + 1}</span> {title}
                  </span>
                  <span aria-hidden="true" className="lp-arrow">↗</span>
                </span>
                <span className="lp-steps__text">{text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <Molecule />
    </div>
  </section>
);
