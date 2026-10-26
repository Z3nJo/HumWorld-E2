import { describe, expect, it } from 'vitest';
import { MORPH_END } from './globeScene';
import { dropAmount, HEADLINE_HUMOR, highlightedTerms, humorOfTerms, scoreAmount, TERMS } from './story';

describe('humorOfTerms', () => {
  it('averages term values over the dictionary scale', () => {
    expect(humorOfTerms([7, 8, 6, -4])).toBeCloseTo(0.425);
  });

  it('stays within -1 and +1 for extreme terms', () => {
    expect(humorOfTerms([10, 10])).toBe(1);
    expect(humorOfTerms([-10])).toBe(-1);
  });

  it('has no score without terms', () => {
    expect(humorOfTerms([])).toBeNull();
  });
});

describe('story headline', () => {
  it('scores inside the [-1, 1] range from its highlighted terms', () => {
    expect(TERMS.length).toBeGreaterThan(1);
    expect(Math.abs(HEADLINE_HUMOR)).toBeLessThanOrEqual(1);
  });
});

describe('story timeline', () => {
  it('highlights terms one by one after the map forms, never before', () => {
    expect(highlightedTerms(MORPH_END, 4)).toBe(0);
    expect(highlightedTerms(0.3, 4)).toBeGreaterThan(0);
    expect(highlightedTerms(0.5, 4)).toBe(4);
    expect(highlightedTerms(1, 4)).toBe(4);
  });

  it('shows the sum only after every term is lit', () => {
    expect(scoreAmount(0.5)).toBe(0);
    expect(scoreAmount(0.6)).toBeCloseTo(0.5);
    expect(scoreAmount(0.7)).toBe(1);
  });

  it('drops the headline onto the map in the last stretch', () => {
    expect(dropAmount(0.7)).toBe(0);
    expect(dropAmount(1)).toBe(1);
  });
});
