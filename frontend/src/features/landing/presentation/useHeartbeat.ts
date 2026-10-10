import { useEffect, useState } from 'react';
import { nextBeat, type ContinentValues } from '../domain/humorScale';

const BEAT_MS = 2600;

// jsdom and some older browsers have no matchMedia.
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Slowly drifts the decorative map values; idle on hidden tabs and for reduced motion.
export const useHeartbeat = (initial: ContinentValues) => {
  const [values, setValues] = useState(initial);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden || prefersReducedMotion()) return;
      setValues((current) => nextBeat(current, Math.random));
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, []);

  return values;
};
