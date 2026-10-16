import type { Continent } from '../../sources/domain/source';

export interface CountryInfo {
  iso: string;
  topo: string;
  es: string;
  cont: Continent;
  lang: 'es' | 'en';
}

export const COUNTRIES_DATA: CountryInfo[] = [
  { iso: 'CL', topo: 'Chile', es: 'Chile', cont: 'America', lang: 'es' },
  { iso: 'AR', topo: 'Argentina', es: 'Argentina', cont: 'America', lang: 'es' },
  { iso: 'MX', topo: 'Mexico', es: 'México', cont: 'America', lang: 'es' },
  { iso: 'CO', topo: 'Colombia', es: 'Colombia', cont: 'America', lang: 'es' },
  { iso: 'BR', topo: 'Brazil', es: 'Brasil', cont: 'America', lang: 'en' },
  { iso: 'US', topo: 'United States of America', es: 'Estados Unidos', cont: 'America', lang: 'en' },
  { iso: 'ES', topo: 'Spain', es: 'España', cont: 'Europa', lang: 'es' },
  { iso: 'GB', topo: 'United Kingdom', es: 'Reino Unido', cont: 'Europa', lang: 'en' },
  { iso: 'FR', topo: 'France', es: 'Francia', cont: 'Europa', lang: 'en' },
  { iso: 'DE', topo: 'Germany', es: 'Alemania', cont: 'Europa', lang: 'en' },
  { iso: 'IT', topo: 'Italy', es: 'Italia', cont: 'Europa', lang: 'en' },
  { iso: 'CN', topo: 'China', es: 'China', cont: 'Asia', lang: 'en' },
  { iso: 'JP', topo: 'Japan', es: 'Japón', cont: 'Asia', lang: 'en' },
  { iso: 'IN', topo: 'India', es: 'India', cont: 'Asia', lang: 'en' },
  { iso: 'SG', topo: 'Singapore', es: 'Singapur', cont: 'Asia', lang: 'en' },
  { iso: 'KR', topo: 'South Korea', es: 'Corea del Sur', cont: 'Asia', lang: 'en' },
  { iso: 'ZA', topo: 'South Africa', es: 'Sudáfrica', cont: 'Africa', lang: 'en' },
  { iso: 'NG', topo: 'Nigeria', es: 'Nigeria', cont: 'Africa', lang: 'en' },
  { iso: 'KE', topo: 'Kenya', es: 'Kenia', cont: 'Africa', lang: 'en' },
  { iso: 'EG', topo: 'Egypt', es: 'Egipto', cont: 'Africa', lang: 'en' },
  { iso: 'AU', topo: 'Australia', es: 'Australia', cont: 'Oceania', lang: 'en' },
];

export const COUNTRIES_BY_ISO: Record<string, CountryInfo> = Object.fromEntries(
  COUNTRIES_DATA.map((c) => [c.iso, c])
);

export const TOPO_TO_ISO: Record<string, string> = Object.fromEntries(
  COUNTRIES_DATA.map((c) => [c.topo, c.iso])
);

export const CONTINENT_ORDER: { key: Continent; label: string }[] = [
  { key: 'Africa', label: 'África' },
  { key: 'America', label: 'América' },
  { key: 'Antartida', label: 'Antártida' },
  { key: 'Asia', label: 'Asia' },
  { key: 'Europa', label: 'Europa' },
  { key: 'Oceania', label: 'Oceanía' },
];

export const CONTINENT_ANCHORS: Record<Continent, [number, number]> = {
  America: [-86, 14],
  Europa: [16, 54],
  Africa: [19, 3],
  Asia: [92, 46],
  Oceania: [134, -25],
  Antartida: [20, -80],
};

export const CONTINENT_OVERRIDES: Record<string, Continent> = {
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

export function formatHumor(v: number | null): string {
  if (v == null) return '—';
  const sign = v > 0.0049 ? '+' : v < -0.0049 ? '−' : '±';
  return `${sign}${Math.abs(v).toFixed(2).replace('.', ',')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-CL');
}
