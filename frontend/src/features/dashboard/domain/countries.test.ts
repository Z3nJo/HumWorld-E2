import { describe, expect, it } from 'vitest';
import atlas from 'world-atlas/countries-110m.json';
import {
  TOPO_TO_ISO,
  CONTINENT_ORDER,
  CONTINENT_EXTENTS,
  countryName,
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

  it('maps every country drawn by the world atlas to its ISO-3166 alpha-2 code', () => {
    const names = atlas.objects.countries.geometries.map((g) => g.properties.name);
    expect(names.filter((name) => !/^[A-Z]{2}$/.test(TOPO_TO_ISO[name] ?? ''))).toEqual([]);
    expect(TOPO_TO_ISO['Chile']).toBe('CL');
    expect(TOPO_TO_ISO['Senegal']).toBe('SN');
    expect(TOPO_TO_ISO['Dem. Rep. Congo']).toBe('CD');
  });

  it('names any ISO country in Spanish, falling back to the code', () => {
    expect(countryName('SN')).toBe('Senegal');
    expect(countryName('CL')).toBe('Chile');
    expect(countryName('X')).toBe('X');
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

  it('has a non-inverted extent for every continent', () => {
    const boxes = Object.values(CONTINENT_EXTENTS);
    expect(boxes).toHaveLength(6);
    boxes.forEach(([[lonMin, latMin], [lonMax, latMax]]) => {
      expect(lonMin).toBeLessThan(lonMax);
      expect(latMin).toBeLessThan(latMax);
    });
  });
});
