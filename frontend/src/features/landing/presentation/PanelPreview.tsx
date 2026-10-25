import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTodayPreview } from '../application/useTodayPreview';
import { CARD_SAMPLE, formatScore, type ContinentValues } from '../domain/humorScale';
import { previewNews, previewWords, type PreviewNews, type PreviewWord } from '../domain/todayPreview';
import { PANEL_PATH } from './paths';
import { WorldMap } from './WorldMap';
import './PanelPreview.css';

const SAMPLE_WORDS: PreviewWord[] = [
  ['acuerdo', 20, 'pos'], ['crisis', 34, 'neg'], ['growth', 17, 'pos'], ['recuperación', 26, 'pos'],
  ['huelga', 16, 'neg'], ['inflación', 22, 'neg'], ['avance', 38, 'pos'], ['sanctions', 15, 'neg'],
  ['récord', 19, 'pos'], ['conflicto', 24, 'neg'], ['peace', 15, 'pos'], ['temporal', 18, 'neg'],
];

const SAMPLE_NEWS: PreviewNews[] = [
  { headline: 'Acuerdo regional amplía cuotas de exportación', score: 0.82 },
  { headline: 'Temporal deja cortes de luz en la zona costera', score: -0.76 },
  { headline: 'Central bank holds rates as inflation eases', score: 0.64 },
];

const MapPreview = ({ values }: { values: ContinentValues }) => (
  <>
    <div className="lp-preview__map">
      <WorldMap variant="card" values={values} />
    </div>
    <div className="lp-preview__scale">
      <span>− negativo</span>
      <span>neutro</span>
      <span>positivo +</span>
    </div>
  </>
);

const CloudPreview = ({ words }: { words: PreviewWord[] }) =>
  words.map(([word, size, tone]) => (
    <span key={word} className={`lp-tone-${tone}`} style={{ fontSize: size }}>
      {word}
    </span>
  ));

const NewsPreview = ({ news }: { news: PreviewNews[] }) =>
  news.map(({ headline, score }, i) => (
    <div key={headline} className="lp-news">
      <span className="lp-news__rank">{i + 1}</span>
      <span className="lp-news__headline">{headline}</span>
      <span className={`lp-stack lp-news__score lp-tone-${score < 0 ? 'neg' : 'pos'}`}>
        {formatScore(score)}
        <span className="lp-news__track">
          <span
            className="lp-news__fill"
            style={{
              width: `${Math.abs(score) * 50}%`,
              [score < 0 ? 'right' : 'left']: '50%',
              // Anchored at the center, so the grow-in animation starts from there.
              transformOrigin: score < 0 ? 'right' : 'left',
            }}
          />
        </span>
      </span>
    </div>
  ));

type Card = { kind: string; preview: ReactNode; title: string; text: string; cta: string };

const cards = (values: ContinentValues, words: PreviewWord[], news: PreviewNews[]): Card[] => [
  {
    kind: 'map',
    preview: <MapPreview values={values} />,
    title: 'Mapa coroplético',
    text: 'Humor por continente con selector de fecha. Haz clic en un continente para bajar al detalle por país.',
    cta: 'Abrir el mapa →',
  },
  {
    kind: 'cloud',
    preview: <CloudPreview words={words} />,
    title: 'Nube de términos',
    text: 'Los términos que más pesaron en el resultado. Verde suma, naranja resta; el tamaño indica su influencia.',
    cta: 'Ver la nube →',
  },
  {
    kind: 'news',
    preview: <NewsPreview news={news} />,
    title: 'Noticias influyentes',
    text: 'Las noticias con valor más extremo de la región y fecha elegidas, con su fuente y tema IPTC.',
    cta: 'Ver el listado →',
  },
];

const dateLabel = (isoDate: string) => isoDate.split('-').reverse().join('-');

export const PanelPreview = () => {
  const today = useTodayPreview();
  const words = today ? previewWords(today.terms) : [];
  const news = today ? previewNews(today.news) : [];
  const items = cards(
    today?.values ?? CARD_SAMPLE,
    words.length > 0 ? words : SAMPLE_WORDS,
    news.length > 0 ? news : SAMPLE_NEWS,
  );

  return (
    <section id="que-veras" aria-labelledby="qv-t" className="lp-section">
      <div className="lp-section__row lp-panel__head">
        <div>
          <div className="lp-eyebrow">03 — Qué verás en el panel</div>
          <h2 id="qv-t" className="lp-section__title">Tres lecturas del mismo día</h2>
        </div>
        <span className="lp-section__note">
          {today ? `Datos reales del ${dateLabel(today.date)}` : 'Previsualizaciones con datos de ejemplo'}
        </span>
      </div>
      <div className="lp-panel">
        {items.map(({ kind, preview, title, text, cta }) => (
          <Link key={kind} to={PANEL_PATH} className="lp-stack lp-panel__card">
            <div aria-hidden="true" className={`lp-panel__preview lp-panel__preview--${kind}`}>
              {preview}
            </div>
            <div className="lp-stack lp-panel__body">
              <h3 className="lp-panel__title">{title}</h3>
              <p className="lp-panel__text">{text}</p>
              <span className="lp-panel__cta">{cta}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
