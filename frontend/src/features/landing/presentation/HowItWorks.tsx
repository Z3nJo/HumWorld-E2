import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './HowItWorks.css';

type Step = { icon: ReactNode; title: string; text: string; link: string; to: string };

const STEPS: Step[] = [
  {
    icon: <><circle cx="11" cy="29" r="2.5" /><path d="M9 19a12 12 0 0 1 12 12" /><path d="M9 10a21 21 0 0 1 21 21" /></>,
    title: 'Canales RSS',
    text: 'Se leen los canales RSS activos de medios y fuentes oficiales. Solo RSS: no se hace scraping de sitios web.',
    link: 'Fuentes y canales ↗',
    to: '/fuentes',
  },
  {
    icon: (
      <>
        <rect x="9" y="7" width="22" height="27" rx="1.5" />
        <path d="M14 14h12M14 20h12M14 26h7" />
      </>
    ),
    title: 'Diccionario de términos',
    text: 'Cada titular y bajada se compara con un diccionario en español e inglés donde cada término tiene un peso positivo o negativo.',
    link: 'Diccionario ↗',
    to: '/dictionary',
  },
  {
    icon: (
      <>
        <path d="M6 22h28M6 18v8M34 18v8M20 19v6" />
        <rect x="23.5" y="11.5" width="6" height="6" transform="rotate(45 26.5 14.5)" />
      </>
    ),
    title: 'Valor de humor',
    text: 'La suma ponderada de los términos da a la noticia un valor entre −1 y +1. Las que no tienen términos reconocidos quedan como no evaluables.',
    link: 'Parámetros ↗',
    to: '/parametros',
  },
  {
    icon: <><circle cx="20" cy="20" r="13" /><ellipse cx="20" cy="20" rx="6" ry="13" /><path d="M7 20h26" /></>,
    title: 'Mapa por continente y país',
    text: 'Los valores se promedian por día y región. Con pocas noticias, el resultado se marca como provisional en lugar de ocultarse.',
    link: 'Dashboard de humor ↗',
    to: '/dashboard',
  },
];

export const HowItWorks = () => (
  <section id="como-funciona" aria-labelledby="cf-t" className="lp-section">
    <div className="lp-section__row">
      <div>
        <div className="lp-eyebrow">02 — Cómo funciona</div>
        <h2 id="cf-t" className="lp-section__title">De un titular a un color en el mapa</h2>
      </div>
      <span className="lp-section__note">4 pasos · se repite en cada captura</span>
    </div>
    <ol className="lp-steps">
      {STEPS.map(({ icon, title, text, link, to }, i) => (
        <li key={to} className="lp-stack lp-steps__item">
          <div className="lp-steps__top">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="lp-steps__icon">
              {icon}
            </svg>
            <span className="lp-section__note">
              Paso {i + 1}
              {i < STEPS.length - 1 && ' →'}
            </span>
          </div>
          <h3 className="lp-steps__title">{title}</h3>
          <p className="lp-steps__text">{text}</p>
          <Link to={to} className="lp-steps__link">{link}</Link>
        </li>
      ))}
    </ol>
  </section>
);
