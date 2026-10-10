import { useLayoutEffect, type RefObject } from 'react';

// Adds `lp-in` to each section block the first time it scrolls into view; CSS animates it.
// The root only gets `lp--reveal` (which hides blocks) once observing works, so without
// IntersectionObserver the content simply stays visible. Layout effect: hide before the
// first paint, or blocks already on screen would flash visible, vanish, then fade back in.
export const useReveal = (root: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver !== 'function') return;

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.add('lp-in');
          observer.unobserve(target);
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );

    el.querySelectorAll('.lp-section > *').forEach((block) => observer.observe(block));
    el.classList.add('lp--reveal');
    return () => observer.disconnect();
  }, [root]);
};
