import { describe, expect, it } from 'vitest';
import type { DashboardAggregate, InfluentialNews, InfluentialTerm } from '../../dashboard/domain/dashboard';
import { continentValues, previewNews, previewWords } from './todayPreview';

const aggregate = (continente: DashboardAggregate['continente'], humor: number | null, pais: string | null = null) =>
  ({ continente, pais, humor, noticias: 5, suficiente: true }) as DashboardAggregate;

const term = (termino: string, peso: number, aporte_total: number) =>
  ({ id_termino: 1, termino, idioma: 'es', peso, aporte_total, frecuencia: 2 }) as InfluentialTerm;

describe('continentValues', () => {
  it('takes the humor of each continent and leaves the rest neutral', () => {
    const values = continentValues([aggregate('Europa', -0.3), aggregate('Asia', null)]);
    expect(values).toMatchObject({ Europa: -0.3, Asia: 0, America: 0 });
  });

  it('ignores country rows', () => {
    expect(continentValues([aggregate('Europa', 0.9, 'ES')])).toBeNull();
  });

  it('is null when no continent has data, so the sample stays', () => {
    expect(continentValues([aggregate('Europa', null)])).toBeNull();
    expect(continentValues([])).toBeNull();
  });
});

describe('previewWords', () => {
  it('sizes by contribution, tones by weight sign and caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => term(`t${i}`, 1, i + 1));
    expect(previewWords(many)).toHaveLength(12);

    const [big, small] = previewWords([term('crisis', -5, -8), term('paz', 4, 2)]);
    expect(big).toEqual(['crisis', 38, 'neg']);
    expect(small[1]).toBeLessThan(big[1]);
    expect(small[2]).toBe('pos');
  });

  it('handles an empty list', () => {
    expect(previewWords([])).toEqual([]);
  });
});

describe('previewNews', () => {
  it('keeps the first three as headline and score', () => {
    const news = [1, 2, 3, 4].map((n) => ({ titulo: `n${n}`, valor_humor: n / 10 }) as InfluentialNews);
    expect(previewNews(news)).toEqual([
      { headline: 'n1', score: 0.1 },
      { headline: 'n2', score: 0.2 },
      { headline: 'n3', score: 0.3 },
    ]);
  });
});
