import { scaleLinear } from 'd3-scale';
import type { Continent } from './continent';

export type ContinentValues = Record<Continent, number>;

// Same colors as the landing's --neg / --neu / --pos tokens in LandingPage.css (domain cannot
// read CSS vars). Phosphor pink to mist white to bioluminescent teal, the particle-orb palette.
export const HUMOR_STOPS: { value: number; color: string }[] = [
  { value: -1, color: '#f29cf7' },
  { value: -0.5, color: '#fad1ff' },
  { value: 0, color: '#edfffe' },
  { value: 0.5, color: '#7fe6df' },
  { value: 1, color: '#19c3b8' },
];

export const humorColor = scaleLinear<string>()
  .domain(HUMOR_STOPS.map(({ value }) => value))
  .range(HUMOR_STOPS.map(({ color }) => color))
  .clamp(true);

// Spanish display: real minus sign and comma decimal, e.g. "−0,76". Values that round to zero
// print unsigned, so -0.004 shows "0,00" instead of "−0,00".
export const formatScore = (value: number) => {
  const digits = Math.abs(value).toFixed(2);
  if (Number(digits) === 0) return '0,00';
  return `${value < 0 ? '−' : '+'}${digits.replace('.', ',')}`;
};

// Illustrative values only: the landing never shows real measurements.
export const HERO_SAMPLE: ContinentValues = {
  America: 0.22,
  Europa: -0.12,
  Africa: 0.05,
  Asia: -0.28,
  Oceania: 0.4,
  Antartida: 0,
};

export const CARD_SAMPLE: ContinentValues = {
  America: 0.35,
  Europa: -0.2,
  Africa: 0.1,
  Asia: -0.45,
  Oceania: 0.55,
  Antartida: 0,
};

const INHABITED: Continent[] = ['America', 'Europa', 'Africa', 'Asia', 'Oceania'];
const BEAT_LIMIT = 0.8;

// One heartbeat of the decorative map: a random inhabited continent drifts a little.
export const nextBeat = (values: ContinentValues, random: () => number): ContinentValues => {
  const continent = INHABITED[Math.floor(random() * INHABITED.length)];
  const drifted = values[continent] + (random() - 0.5) * 0.9;
  return { ...values, [continent]: Math.min(BEAT_LIMIT, Math.max(-BEAT_LIMIT, drifted)) };
};
