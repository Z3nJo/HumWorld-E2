import { geoCentroid, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries from 'world-atlas/countries-110m.json';
import { continentOf, type Continent } from './continent';
import { HERO_SAMPLE, humorColor } from './humorScale';

const TOPOLOGY = countries as unknown as Topology;
const COUNTRIES = feature(TOPOLOGY, TOPOLOGY.objects.countries as GeometryCollection).features.map(
  (country) => ({
    country,
    continent: continentOf((country.properties as { name: string }).name, geoCentroid(country)),
  }),
);

const STEP_DEGREES = 4;

export type GlobeParticle = { lon: number; lat: number; continent: Continent; color: string };

// Regular lon/lat grid filtered to land, colored with the hero's sample values; run once, not per frame.
export const createGlobeParticles = (): GlobeParticle[] => {
  const particles: GlobeParticle[] = [];
  for (let lat = -88; lat <= 88; lat += STEP_DEGREES) {
    for (let lon = -180; lon < 180; lon += STEP_DEGREES) {
      const hit = COUNTRIES.find(({ country }) => geoContains(country, [lon, lat]));
      if (hit) particles.push({ lon, lat, continent: hit.continent, color: humorColor(HERO_SAMPLE[hit.continent]) });
    }
  }
  return particles;
};
