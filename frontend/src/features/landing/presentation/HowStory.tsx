import { Fragment, useRef, useState } from 'react';
import { flatPoint, storyProgress } from '../domain/globeScene';
import { formatScore, humorColor } from '../domain/humorScale';
import { dropAmount, HEADLINE, HEADLINE_HUMOR, highlightedTerms, scoreAmount, TERMS } from '../domain/story';
import { useScrollFrame } from './useScrollFrame';
import './HowStory.css';

// Where the headline lands: Europe, as a percentage of the 2:1 map slot.
const LANDING = flatPoint([15, 50], { x: 0, y: 0, width: 1 });
const DROP_START_TOP = -45;

const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value)}`;

// Pinned scroll story: the globe becomes the map (drawn by GlobeCanvas in the slot), the
// headline's dictionary terms light up, their values add up to a score, and the headline
// falls on the map as one dot. All state derives from the scroll progress.
export const HowStory = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useScrollFrame(() => {
    const el = ref.current;
    if (!el) return;
    const { top, height } = el.getBoundingClientRect();
    // Steps of 0.5%: smooth enough to read as continuous, few enough to skip idle renders.
    setProgress(Math.round(storyProgress(top, height, window.innerHeight) * 200) / 200);
  });

  const lit = highlightedTerms(progress, TERMS.length);
  const sum = scoreAmount(progress);
  const drop = dropAmount(progress);
  const color = humorColor(HEADLINE_HUMOR);
  let termIndex = 0;

  return (
    <div ref={ref} data-story className="lp-story">
      <div className="lp-story__stage">
        <div className="lp-story__copy" style={{ opacity: 1 - drop }}>
          <p className="lp-story__eyebrow">Ejemplo ilustrativo de un titular</p>
          <p className="lp-story__headline">
            {HEADLINE.map(({ text, value }) => {
              if (value === undefined) return <Fragment key={text}>{text}</Fragment>;
              const on = termIndex++ < lit;
              return (
                <mark key={text} data-on={on} className={`lp-story__term lp-story__term--${value < 0 ? 'neg' : 'pos'}`}>
                  {text}
                  <sup className="lp-story__value">{signed(value)}</sup>
                </mark>
              );
            })}
          </p>
          <p className="lp-story__score" style={{ opacity: sum }}>
            Humor de la noticia <strong style={{ color }}>{formatScore(HEADLINE_HUMOR * sum)}</strong>
            <span className="lp-story__formula">suma de términos ÷ (10 × {TERMS.length} términos)</span>
          </p>
        </div>
        <div data-map-slot className="lp-story__map">
          <span
            aria-hidden="true"
            className="lp-story__drop"
            style={{
              left: `${LANDING.x * 100}%`,
              top: `${DROP_START_TOP + (LANDING.y * 200 - DROP_START_TOP) * drop}%`,
              opacity: Math.min(1, drop * 6),
              background: color,
            }}
          />
        </div>
      </div>
    </div>
  );
};
