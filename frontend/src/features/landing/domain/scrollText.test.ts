import { kineticDrift, revealedWords } from './scrollText';

describe('revealedWords', () => {
  it('lights no word before the block reaches 90% of the viewport', () => {
    expect(revealedWords(900, 1000, 10)).toBe(0);
    expect(revealedWords(1200, 1000, 10)).toBe(0);
  });

  it('lights words in proportion while the block rises to 40%', () => {
    expect(revealedWords(650, 1000, 10)).toBe(5);
  });

  it('lights every word from 40% upward', () => {
    expect(revealedWords(400, 1000, 10)).toBe(10);
    expect(revealedWords(-300, 1000, 10)).toBe(10);
  });
});

describe('kineticDrift', () => {
  it('goes from +1 entering at the bottom to -1 leaving at the top', () => {
    expect(kineticDrift(1000, 400, 1000)).toBe(1);
    expect(kineticDrift(300, 400, 1000)).toBe(0);
    expect(kineticDrift(-400, 400, 1000)).toBe(-1);
  });
});
