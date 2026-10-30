import { describe, expect, it } from 'vitest';
import { humorPolarity, safeNewsUrl } from './news';

describe('safeNewsUrl', () => {
  it.each(['http://a.cl/x', 'https://a.cl/x', 'HTTPS://a.cl/x'])('accepts %s', (url) => {
    expect(safeNewsUrl(url)).toBe(url);
  });

  it.each(['javascript:alert(1)', '/relativa', 'ftp://a.cl', ''])('rejects %j', (url) => {
    expect(safeNewsUrl(url)).toBeNull();
  });
});

describe('humorPolarity', () => {
  it('uses the same neutral threshold as formatHumor', () => {
    expect(humorPolarity(0.5)).toBe('pos');
    expect(humorPolarity(-0.5)).toBe('neg');
    expect(humorPolarity(0.004)).toBe('neu');
    expect(humorPolarity(-0.004)).toBe('neu');
    expect(humorPolarity(0)).toBe('neu');
  });
});
