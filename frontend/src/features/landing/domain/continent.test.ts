import { continentOf } from './continent';

describe('continentOf', () => {
  it('uses the override table before the centroid rules', () => {
    expect(continentOf('Russia', [96, 62])).toBe('Europa');
    expect(continentOf('Turkey', [35, 39])).toBe('Asia');
    expect(continentOf('New Zealand', [172, -41])).toBe('Oceania');
  });

  it.each([
    ['Antarctica', [20, -80], 'Antartida'],
    ['Brazil', [-53, -10], 'America'],
    ['Australia', [134, -25], 'Oceania'],
    ['France', [2, 46], 'Europa'],
    ['Saudi Arabia', [45, 24], 'Asia'],
    ['Nigeria', [8, 9], 'Africa'],
    ['China', [104, 36], 'Asia'],
  ] as const)('places %s by its centroid', (name, centroid, continent) => {
    expect(continentOf(name, [...centroid])).toBe(continent);
  });
});
