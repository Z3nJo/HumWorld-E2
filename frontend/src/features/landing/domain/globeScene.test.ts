import { describe, expect, it } from 'vitest';
import { flatPoint, globeRotation, MORPH_END, morphAmount, placeParticle, storyProgress } from './globeScene';

const GLOBE = { x: 400, y: 300, radius: 200 };
const MAP = { x: 0, y: 100, width: 800 };

describe('globeRotation', () => {
  it('spins eastward as the page scrolls and keeps the tilt', () => {
    const [start, tilt] = globeRotation(0);
    const [later, laterTilt] = globeRotation(400);
    expect(later).toBeLessThan(start);
    expect(laterTilt).toBe(tilt);
  });
});

describe('storyProgress', () => {
  it('is 0 before the stage pins, 1 at the end, and clamped in between', () => {
    expect(storyProgress(500, 3000, 800)).toBe(0);
    expect(storyProgress(0, 3000, 800)).toBe(0);
    expect(storyProgress(-1100, 3000, 800)).toBeCloseTo(0.5);
    expect(storyProgress(-5000, 3000, 800)).toBe(1);
  });

  it('is 0 when the section is not taller than the viewport', () => {
    expect(storyProgress(-100, 600, 800)).toBe(0);
  });
});

describe('morphAmount', () => {
  it('goes from globe to map within the first part of the story', () => {
    expect(morphAmount(0)).toBe(0);
    expect(morphAmount(MORPH_END)).toBe(1);
    expect(morphAmount(1)).toBe(1);
    expect(morphAmount(MORPH_END / 2)).toBeCloseTo(0.5);
  });
});

describe('placeParticle', () => {
  const facing = globeRotation(0);

  it('puts the dot facing the viewer on the globe, fully visible', () => {
    const dot = placeParticle({ lon: 20, lat: 15 }, GLOBE, MAP, facing, 0);
    expect(dot.x).toBeCloseTo(GLOBE.x);
    expect(dot.y).toBeCloseTo(GLOBE.y);
    expect(dot.alpha).toBe(1);
  });

  it('hides the far hemisphere on the globe and reveals it on the map', () => {
    const farSide = { lon: -160, lat: 15 };
    expect(placeParticle(farSide, GLOBE, MAP, facing, 0).alpha).toBe(0);
    expect(placeParticle(farSide, GLOBE, MAP, facing, 1).alpha).toBe(1);
  });

  it('ends exactly where the map puts it', () => {
    const dot = placeParticle({ lon: 15, lat: 50 }, GLOBE, MAP, facing, 1);
    const target = flatPoint([15, 50], MAP);
    expect(dot.x).toBeCloseTo(target.x);
    expect(dot.y).toBeCloseTo(target.y);
  });
});
