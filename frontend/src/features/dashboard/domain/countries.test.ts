import { describe, expect, it } from 'vitest';
import {
  COUNTRIES_DATA,
  COUNTRIES_BY_ISO,
  TOPO_TO_ISO,
  CONTINENT_ORDER,
  formatHumor,
  formatNumber,
} from './countries';

describe('dashboard countries and helpers', () => {
  it('formats humor value correctly with positive, negative and zero cases', () => {
    expect(formatHumor(null)).toBe('—');
    expect(formatHumor(0.45)).toBe('+0,45');
    expect(formatHumor(-0.62)).toBe('−0,62');
    expect(formatHumor(0)).toBe('±0,00');
    expect(formatHumor(0.002)).toBe('±0,00');
  });

  it('formats numbers with Chilean locale dots', () => {
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatNumber(0)).toBe('0');
  });

  it('has consistent metadata mapping between ISO and TopoJSON names', () => {
    expect(COUNTRIES_DATA.length).toBeGreaterThan(15);
    expect(COUNTRIES_BY_ISO['CL']?.es).toBe('Chile');
    expect(COUNTRIES_BY_ISO['CL']?.cont).toBe('America');
    expect(TOPO_TO_ISO['Chile']).toBe('CL');
    expect(TOPO_TO_ISO['Spain']).toBe('ES');
  });

  it('contains all 6 continents in order', () => {
    expect(CONTINENT_ORDER.map((c) => c.key)).toEqual([
      'Africa',
      'America',
      'Antartida',
      'Asia',
      'Europa',
      'Oceania',
    ]);
  });
});
