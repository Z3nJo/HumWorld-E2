import { geoBounds, geoCentroid, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries from 'world-atlas/countries-110m.json';
import { continentOf, type Continent } from './continent';
import { HERO_SAMPLE, humorColor } from './humorScale';

const TOPOLOGY = countries as unknown as Topology;
const COUNTRIES = feature(TOPOLOGY, TOPOLOGY.objects.countries as GeometryCollection).features.map(
  (country) => ({
    country,
    bounds: geoBounds(country),
    continent: continentOf((country.properties as { name: string }).name, geoCentroid(country)),
  }),
);

const STEP_DEGREES = 4;

// `glow` is the orb's own bioluminescent tint (hero); `color` is the humor value (map).
export type GlobeParticle = { lon: number; lat: number; continent: Continent; color: string; glow: string };

// Mostly mid teal, with a few bright cyan and near-white specks, like the reference orb.
const GLOW = ['#2fb3aa', '#3fc4bb', '#5fd6ce', '#5fd6ce', '#8de8e1', '#8de8e1', '#c9fffb', '#edfffe'];

// Deterministic per grid point, so the orb looks the same on every load and in tests.
const glowAt = (lon: number, lat: number) => GLOW[Math.abs((lon * 73856093) ^ (lat * 19349663)) % GLOW.length];

// A cheap box test first: geoContains over every country for every grid point is seconds of work.
// Boxes that cross the antimeridian (Russia, Fiji) have west > east.
const inBounds = ([[west, south], [east, north]]: [[number, number], [number, number]], lon: number, lat: number) =>
  lat >= south && lat <= north && (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east);

// Regular lon/lat grid filtered to land, colored with the hero's sample values; run once, not per frame.
export const createGlobeParticles = (): GlobeParticle[] => {
  const particles: GlobeParticle[] = [];
  for (let lat = -88; lat <= 88; lat += STEP_DEGREES) {
    for (let lon = -180; lon < 180; lon += STEP_DEGREES) {
      const hit = COUNTRIES.find(({ country, bounds }) => inBounds(bounds, lon, lat) && geoContains(country, [lon, lat]));
      if (hit) {
        const color = humorColor(HERO_SAMPLE[hit.continent]);
        particles.push({ lon, lat, continent: hit.continent, color, glow: glowAt(lon, lat) });
      }
    }
  }
  return particles;
};
