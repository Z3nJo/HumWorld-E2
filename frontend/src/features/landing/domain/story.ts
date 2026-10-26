import { clamp01, easeInOut, MORPH_END } from './globeScene';

// Illustrative headline: term values use the dictionary's [-10, 10] scale.
export type HeadlinePart = { text: string; value?: number };

export const HEADLINE: HeadlinePart[] = [
  { text: 'El ' },
  { text: 'acuerdo', value: 7 },
  { text: ' impulsa un ' },
  { text: 'récord', value: 8 },
  { text: ' de ' },
  { text: 'crecimiento', value: 6 },
  { text: ' pese a la ' },
  { text: 'inflación', value: -4 },
];

export const TERMS = HEADLINE.filter((part): part is Required<HeadlinePart> => part.value !== undefined);

const TERM_SCALE = 10;

// Default formula (promedio_ponderado) with one occurrence per term: sum / (scale × occurrences).
export const humorOfTerms = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / (TERM_SCALE * values.length);

export const HEADLINE_HUMOR = humorOfTerms(TERMS.map(({ value }) => value))!;

// Story timeline over the pinned scroll: the globe becomes the map (0 → MORPH_END),
// terms light up, their sum appears, then the headline drops onto the map.
const TERMS_END = 0.5;
const SCORE_END = 0.7;

// How many terms are highlighted at this progress.
export const highlightedTerms = (progress: number, count: number) =>
  Math.ceil(clamp01((progress - MORPH_END) / (TERMS_END - MORPH_END)) * count);

export const scoreAmount = (progress: number) => clamp01((progress - TERMS_END) / (SCORE_END - TERMS_END));

export const dropAmount = (progress: number) => easeInOut(clamp01((progress - SCORE_END) / (1 - SCORE_END)));
