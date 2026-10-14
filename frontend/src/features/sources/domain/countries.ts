import type { Continent } from './source';

export interface CountryOption {
  code: string;
  name: string;
  continent: Continent;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'CL', name: 'Chile', continent: 'America' },
  { code: 'AR', name: 'Argentina', continent: 'America' },
  { code: 'MX', name: 'México', continent: 'America' },
  { code: 'CO', name: 'Colombia', continent: 'America' },
  { code: 'BR', name: 'Brasil', continent: 'America' },
  { code: 'US', name: 'Estados Unidos', continent: 'America' },
  { code: 'ES', name: 'España', continent: 'Europa' },
  { code: 'GB', name: 'Reino Unido', continent: 'Europa' },
  { code: 'FR', name: 'Francia', continent: 'Europa' },
  { code: 'DE', name: 'Alemania', continent: 'Europa' },
  { code: 'IT', name: 'Italia', continent: 'Europa' },
  { code: 'CN', name: 'China', continent: 'Asia' },
  { code: 'JP', name: 'Japón', continent: 'Asia' },
  { code: 'IN', name: 'India', continent: 'Asia' },
  { code: 'KR', name: 'Corea del Sur', continent: 'Asia' },
  { code: 'ZA', name: 'Sudáfrica', continent: 'Africa' },
  { code: 'NG', name: 'Nigeria', continent: 'Africa' },
  { code: 'KE', name: 'Kenia', continent: 'Africa' },
  { code: 'EG', name: 'Egipto', continent: 'Africa' },
  { code: 'AU', name: 'Australia', continent: 'Oceania' },
];

export const COUNTRY_BY_CODE = new Map<string, CountryOption>(
  COUNTRIES.map((c) => [c.code, c]),
);
