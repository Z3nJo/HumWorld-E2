import { CARD_SAMPLE, formatScore, nextBeat } from './humorScale';

describe('formatScore', () => {
  it.each([
    [0.82, '+0,82'],
    [-0.76, '−0,76'],
    [0, '0,00'],
    [-0.004, '0,00'],
    [0.004, '0,00'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });
});

describe('nextBeat', () => {
  // Returns the queued numbers in order, like a scripted Math.random.
  const sequence = (...values: number[]) => () => values.shift() ?? 0;

  it('nudges one inhabited continent and leaves the input untouched', () => {
    const before = { ...CARD_SAMPLE };

    // 0.3 * 5 inhabited continents -> index 1 (Europa); delta (0.7 - 0.5) * 0.9 = 0.18.
    const next = nextBeat(CARD_SAMPLE, sequence(0.3, 0.7));

    expect(next).not.toBe(CARD_SAMPLE);
    expect(CARD_SAMPLE).toEqual(before);
    expect(next).toEqual({ ...CARD_SAMPLE, Europa: expect.closeTo(-0.02) });
  });

  it('clamps the new value to the [-0.8, 0.8] band', () => {
    // Index 4 (Oceania, 0.55) pushed up by 0.45 -> 1.0, clamped to 0.8.
    expect(nextBeat(CARD_SAMPLE, sequence(0.99, 1)).Oceania).toBe(0.8);
    // Index 3 (Asia, -0.45) pushed down by 0.45 -> -0.9, clamped to -0.8.
    expect(nextBeat(CARD_SAMPLE, sequence(0.7, 0)).Asia).toBe(-0.8);
  });

  it('never moves Antarctica', () => {
    expect(nextBeat(CARD_SAMPLE, sequence(0.9999, 1)).Antartida).toBe(0);
  });
});
