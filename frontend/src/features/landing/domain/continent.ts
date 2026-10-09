export type Continent = 'America' | 'Europa' | 'Africa' | 'Asia' | 'Oceania' | 'Antartida';

// Countries whose centroid falls on the wrong side of the rough boxes below.
const OVERRIDES: Record<string, Continent> = {
  Russia: 'Europa',
  Turkey: 'Asia',
  Georgia: 'Asia',
  Armenia: 'Asia',
  Azerbaijan: 'Asia',
  Turkmenistan: 'Asia',
  Kazakhstan: 'Asia',
  Cyprus: 'Europa',
  'N. Cyprus': 'Europa',
  Eritrea: 'Africa',
  'Fr. S. Antarctic Lands': 'Antartida',
  Indonesia: 'Asia',
  'Timor-Leste': 'Asia',
  Fiji: 'Oceania',
  'Papua New Guinea': 'Oceania',
  'New Zealand': 'Oceania',
};

// Rough lon/lat boxes, good enough for the illustrative landing map.
export const continentOf = (countryName: string, [lon, lat]: [lon: number, lat: number]): Continent => {
  const override = OVERRIDES[countryName];
  if (override) return override;
  if (lat < -60) return 'Antartida';
  if (lon < -25) return 'America';
  if ((lon > 110 && lat < -10) || (lon > 130 && lat < 0)) return 'Oceania';
  if (lat >= 36 && lon >= -25 && lon < 60) return 'Europa';
  if (lon > 34 && lat > 12 && lat < 36) return 'Asia';
  if (lon >= -25 && lon < 52 && lat < 36) return 'Africa';
  return 'Asia';
};
