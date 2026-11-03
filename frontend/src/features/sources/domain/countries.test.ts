import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_BY_CODE } from './countries';

describe('source country catalog', () => {
  it('offers every country of the backend geographic catalog, not a short list', () => {
    expect(COUNTRY_BY_CODE.get('SN')).toEqual({ code: 'SN', name: 'Senegal', continent: 'Africa' });
    expect(COUNTRY_BY_CODE.get('CL')).toEqual({ code: 'CL', name: 'Chile', continent: 'America' });
    expect(COUNTRY_BY_CODE.get('AQ')?.continent).toBe('Antartida');
    expect(COUNTRIES.filter((c) => c.continent === 'Africa').length).toBeGreaterThan(50);
  });

  it('has unique ISO alpha-2 codes', () => {
    expect(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code))).toBe(true);
    expect(COUNTRY_BY_CODE.size).toBe(COUNTRIES.length);
  });
});
