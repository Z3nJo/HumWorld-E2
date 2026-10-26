import { geoDistance, geoNaturalEarth1, geoOrthographic } from 'd3-geo';
import type { GlobeParticle } from './globeParticles';

export type Point = { x: number; y: number };
export type GlobeBox = Point & { radius: number };
// Width is twice the height: the map keeps the 2:1 box of the Natural Earth projection.
export type MapBox = Point & { width: number };
export type PlacedParticle = Point & { alpha: number };

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const easeInOut = (t: number) => t * t * (3 - 2 * t);

const DEGREES_PER_PX = 0.15;
const BASE_ROTATION: [number, number] = [-20, -15];

// Scrolling spins the globe eastward; the latitude tilt stays fixed.
export const globeRotation = (scrollY: number): [number, number] => [
  BASE_ROTATION[0] - scrollY * DEGREES_PER_PX,
  BASE_ROTATION[1],
];

// Swell of the orb's surface at a point and time (seconds), in -1..1. Two slow waves cross
// the sphere at different angles and speeds, so the crests roll like water, never in lockstep.
export const waveAt = (lon: number, lat: number, time: number) =>
  0.6 * Math.sin(lat * 0.11 + lon * 0.045 - time * 1.6) + 0.4 * Math.sin(lon * 0.09 - lat * 0.05 - time * 1.05);

// Share of the story's pinned scroll spent turning the globe into the map.
export const MORPH_END = 0.2;

// Progress (0..1) through the pinned story: 0 while its top is below the viewport top,
// 1 once the stage is about to unpin.
export const storyProgress = (top: number, height: number, viewport: number) => {
  const travel = height - viewport;
  return travel <= 0 ? 0 : clamp01(-top / travel);
};

export const morphAmount = (progress: number) => easeInOut(clamp01(progress / MORPH_END));

// Unit-sized projections: both are scaled to the target box per frame.
// clipAngle(180) keeps the far side projectable, so those dots can fly to the map.
const GLOBE = geoOrthographic().clipAngle(180).scale(1).translate([0, 0]);
const FLAT = geoNaturalEarth1().fitExtent([[0, 0], [1, 0.5]], { type: 'Sphere' });

// Where a [lon, lat] lands inside a map box; shared by the particles and the falling dot.
export const flatPoint = (lonLat: [number, number], { x, y, width }: MapBox): Point => {
  const [fx, fy] = FLAT(lonLat)!;
  return { x: x + fx * width, y: y + fy * width };
};

export const placeParticle = (
  { lon, lat }: Pick<GlobeParticle, 'lon' | 'lat'>,
  globe: GlobeBox,
  map: MapBox,
  rotation: [number, number],
  morph: number,
): PlacedParticle => {
  GLOBE.rotate(rotation);
  const [gx, gy] = GLOBE([lon, lat])!;
  const from = { x: globe.x + gx * globe.radius, y: globe.y + gy * globe.radius };
  const to = flatPoint([lon, lat], map);
  const facing = geoDistance([lon, lat], [-rotation[0], -rotation[1]]) < Math.PI / 2;
  return {
    x: lerp(from.x, to.x, morph),
    y: lerp(from.y, to.y, morph),
    // The hidden hemisphere fades in while it travels to the map.
    alpha: facing ? 1 : morph,
  };
};
