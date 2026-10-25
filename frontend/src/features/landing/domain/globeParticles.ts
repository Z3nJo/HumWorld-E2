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

export type GlobeParticle = { lon: number; lat: number; continent: Continent; color: string };

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
      if (hit) particles.push({ lon, lat, continent: hit.continent, color: humorColor(HERO_SAMPLE[hit.continent]) });
    }
  }
  return particles;
};
