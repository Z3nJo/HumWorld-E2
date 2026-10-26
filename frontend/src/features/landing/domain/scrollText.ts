import { clamp01 } from './globeScene';

// Words light up while the block crosses the viewport: none when its top sits at 90% of the
// viewport height, all of them once it reaches 40%.
const REVEAL_FROM = 0.9;
const REVEAL_TO = 0.4;

export const revealedWords = (top: number, viewport: number, words: number) =>
  Math.round(clamp01((REVEAL_FROM * viewport - top) / ((REVEAL_FROM - REVEAL_TO) * viewport)) * words);

// Horizontal drift of the kinetic lines, from +1 (block entering at the bottom) to -1
// (leaving at the top). Each line multiplies it by its own direction and range.
export const kineticDrift = (top: number, height: number, viewport: number) => {
  const travel = viewport + height;
  return travel <= 0 ? 0 : 1 - 2 * clamp01((viewport - top) / travel);
};
