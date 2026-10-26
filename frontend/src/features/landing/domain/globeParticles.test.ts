import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land from 'world-atlas/land-110m.json';
import { createGlobeParticles } from './globeParticles';

const LAND = feature(
  land as unknown as Topology,
  (land as unknown as Topology).objects.land as GeometryCollection,
);

const CONTINENTS = ['America', 'Europa', 'Africa', 'Asia', 'Oceania', 'Antartida'];

describe('createGlobeParticles', () => {
  it('generates particles only on land', () => {
    const particles = createGlobeParticles();

    expect(particles.length).toBeGreaterThan(500);
    for (const { lon, lat } of particles) {
      expect(geoContains(LAND, [lon, lat])).toBe(true);
    }
  });

  it('labels every particle with a continent', () => {
    const particles = createGlobeParticles();
    const continents = new Set(particles.map(({ continent }) => continent));

    expect(particles.every(({ continent }) => CONTINENTS.includes(continent))).toBe(true);
    expect(continents).toEqual(new Set(['America', 'Europa', 'Africa', 'Asia', 'Oceania', 'Antartida']));
    // 48°N 8°E is the Black Forest, in Germany.
    expect(particles.find(({ lon, lat }) => lon === 8 && lat === 48)?.continent).toBe('Europa');
  });

  it("colors each particle with its continent's sample value on the humor scale", () => {
    const particles = createGlobeParticles();
    // Hand-interpolated between the legend stops: Europa -0.12, Oceania 0.4, Antartida 0.
    const expected = {
      Europa: 'rgb(240, 244, 254)',
      Oceania: 'rgb(149, 235, 229)',
      Antartida: 'rgb(237, 255, 254)',
    };

    for (const [continent, color] of Object.entries(expected)) {
      const sample = particles.filter((particle) => particle.continent === continent);
      expect(sample.length).toBeGreaterThan(0);
      expect(sample.every((particle) => particle.color === color)).toBe(true);
    }
  });
});
