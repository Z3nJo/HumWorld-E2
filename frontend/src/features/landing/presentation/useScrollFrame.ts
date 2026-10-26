import { useEffect, useRef } from 'react';

// Runs `onFrame` once on mount and then at most once per animation frame while the page
// scrolls or resizes. The latest callback is always used, so it may close over fresh state.
export const useScrollFrame = (onFrame: () => void) => {
  const latest = useRef(onFrame);
  useEffect(() => {
    latest.current = onFrame;
  });

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        latest.current();
      });
    };
    latest.current();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
};
