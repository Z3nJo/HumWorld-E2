import type { DashboardAggregate, InfluentialNews, InfluentialTerm } from '../../dashboard/domain/dashboard';
import type { ContinentValues } from './humorScale';

export type Tone = 'pos' | 'neg';
export type PreviewWord = [word: string, size: number, tone: Tone];
export type PreviewNews = { headline: string; score: number };

const WORD_COUNT = 12;
const NEWS_COUNT = 3;
const MIN_SIZE = 15;
const SIZE_RANGE = 23;

// Continents the API has no evaluable news for stay neutral; null when none has data at all.
export const continentValues = (aggregates: DashboardAggregate[]): ContinentValues | null => {
  const values: ContinentValues = { America: 0, Europa: 0, Africa: 0, Asia: 0, Oceania: 0, Antartida: 0 };
  let any = false;
  for (const { continente, pais, humor } of aggregates) {
    if (pais !== null || humor === null) continue;
    values[continente] = humor;
    any = true;
  }
  return any ? values : null;
};

// Biggest contributors first; the font size grows with the share of the top term's weight.
export const previewWords = (terms: InfluentialTerm[]): PreviewWord[] => {
  const top = [...terms].sort((a, b) => Math.abs(b.aporte_total) - Math.abs(a.aporte_total)).slice(0, WORD_COUNT);
  const max = Math.abs(top[0]?.aporte_total ?? 0) || 1;
  return top.map(({ termino, peso, aporte_total }) => [
    termino,
    Math.round(MIN_SIZE + (Math.abs(aporte_total) / max) * SIZE_RANGE),
    peso < 0 ? 'neg' : 'pos',
  ]);
};

export const previewNews = (news: InfluentialNews[]): PreviewNews[] =>
  news.slice(0, NEWS_COUNT).map(({ titulo, valor_humor }) => ({ headline: titulo, score: valor_humor }));
