import { useRef, useState, type CSSProperties, type ElementType } from 'react';
import { kineticDrift, revealedWords } from '../domain/scrollText';
import { useScrollFrame } from './useScrollFrame';
import './ScrollText.css';

type RevealProps = { as?: ElementType; id?: string; text: string; className?: string };

// Manifesto line: each word goes from dim teal to white as the block scrolls up, and the
// last ones warm toward phosphor pink. The full sentence is always in the DOM for readers.
export const RevealText = ({ as: Tag = 'p', id, text, className = '' }: RevealProps) => {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(' ');
  // Dim until the first frame measures it; only the color changes, the text is always there.
  const [lit, setLit] = useState(0);

  useScrollFrame(() => {
    const el = ref.current;
    if (!el) return;
    setLit(revealedWords(el.getBoundingClientRect().top, window.innerHeight, words.length));
  });

  return (
    <Tag ref={ref} id={id} className={`lp-reveal ${className}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          data-on={i < lit}
          className="lp-reveal__word"
          style={{ '--warm': `${Math.round(Math.max(0, i / words.length - 0.55) * 160)}%` } as CSSProperties}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
};

// Oversized two-line display text that slides sideways, each line the opposite way.
export const KineticText = ({ lines }: { lines: [string, string] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [drift, setDrift] = useState(0);

  useScrollFrame(() => {
    const el = ref.current;
    if (!el) return;
    const { top, height } = el.getBoundingClientRect();
    setDrift(Math.round(kineticDrift(top, height, window.innerHeight) * 1000) / 1000);
  });

  return (
    <div ref={ref} aria-hidden="true" className="lp-kinetic">
      <span className="lp-kinetic__line" style={{ transform: `translateX(${8 + drift * 14}%)` }}>
        {lines[0]}
      </span>
      <span className="lp-kinetic__line" style={{ transform: `translateX(${-4 - drift * 14}%)` }}>
        {lines[1]}
      </span>
    </div>
  );
};
