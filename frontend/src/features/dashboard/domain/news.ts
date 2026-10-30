export type Polarity = 'pos' | 'neg' | 'neu';

export function safeNewsUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

// Same neutral threshold as formatHumor (|v| < 0.005).
export function humorPolarity(v: number): Polarity {
  return v > 0.0049 ? 'pos' : v < -0.0049 ? 'neg' : 'neu';
}
