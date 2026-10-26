import { useEffect, useRef, type RefObject } from 'react';
import { globeRotation, morphAmount, placeParticle, storyProgress, waveAt, type GlobeBox, type MapBox } from '../domain/globeScene';
import { createGlobeParticles, type GlobeParticle } from '../domain/globeParticles';
import { useScrollFrame } from './useScrollFrame';

const GLOBE_DOT = 0.0042;
const MAP_DOT = 0.003;
// Each land point is drawn as a small swarm of specks, so the orb reads as a dense cloud
// instead of a regular grid. Offsets are in degrees and fixed, so nothing flickers.
const SWARM: [number, number][] = [[0, 0], [1.6, 0.9], [-1.2, 1.5], [0.7, -1.7], [-1.8, -0.6]];
// How far a wave crest pushes a speck out from the orb's center, as a share of its radius.
const WAVE_LIFT = 0.045;

type Scene = { context: CanvasRenderingContext2D; particles: GlobeParticle[] };

const drawParticles = (
  { context, particles }: Scene,
  globe: GlobeBox,
  map: MapBox,
  rotation: [number, number],
  morph: number,
  time: number,
) => {
  const radius = globe.radius * GLOBE_DOT * (1 - morph) + map.width * MAP_DOT * morph;
  // The orb glows in teal; halfway into the map the dots switch to their humor color.
  const humor = morph >= 0.5;
  // The swarm collapses back to one dot per point as the map forms.
  const swarm = morph > 0.6 ? SWARM.slice(0, 1) : SWARM;
  // The swell calms down as the orb flattens, so the map lands perfectly still.
  const calm = 1 - morph;
  for (const particle of particles) {
    context.fillStyle = humor ? particle.color : particle.glow;
    for (const [dLon, dLat] of swarm) {
      const point = { lon: particle.lon + dLon * calm, lat: particle.lat + dLat * calm };
      const { x, y, alpha } = placeParticle(point, globe, map, rotation, morph);
      if (alpha <= 0) continue;
      const swell = calm > 0 ? waveAt(point.lon, point.lat, time) : 0;
      // Crests rise off the surface and catch more light; troughs sink and dim.
      const lift = 1 + WAVE_LIFT * calm * swell;
      const px = globe.x + (x - globe.x) * lift;
      const py = globe.y + (y - globe.y) * lift;
      context.globalAlpha = alpha * (1 - 0.3 * calm * (1 - swell) / 2);
      // Square specks are cheaper than arcs and match the reference's pixel-like grain.
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
  }
  context.globalAlpha = 1;
};

const drawFrame = (
  canvas: HTMLCanvasElement | null,
  page: HTMLElement | null,
  scene: { current: Scene | null | undefined },
  time: number,
) => {
  if (!canvas || !page) return;
  if (scene.current === undefined) {
    const context = canvas.getContext('2d');
    scene.current = context ? { context, particles: createGlobeParticles() } : null;
  }
  if (!scene.current) return;

  const { innerWidth: width, innerHeight: height, devicePixelRatio: ratio = 1, scrollY } = window;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const { context } = scene.current;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const rotation = globeRotation(scrollY);
  const orb = page.querySelector('[data-globe-slot]')?.getBoundingClientRect();
  const story = page.querySelector('[data-story]')?.getBoundingClientRect();
  const slot = page.querySelector('[data-map-slot]')?.getBoundingClientRect();

  if (orb && orb.bottom > 0 && orb.top < height) {
    const globe = { x: orb.left + orb.width / 2, y: orb.top + orb.height / 2, radius: orb.width / 2 };
    drawParticles(scene.current, globe, { x: 0, y: 0, width: 1 }, rotation, 0, time);
  }
  if (story && slot && slot.bottom > 0 && slot.top < height) {
    const globe = { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2, radius: slot.height / 2 };
    const morph = morphAmount(storyProgress(story.top, story.height, height));
    drawParticles(scene.current, globe, { x: slot.left, y: slot.top, width: slot.width }, rotation, morph, time);
  }
};

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Decorative layer, fixed over the viewport and hidden from assistive tech. One set of
// particles is drawn at the hero (a spinning, rippling orb) and at the story's map slot,
// where scrolling reorders them into the flat map. Both anchors are read from the DOM per
// frame. The ripple needs a frame loop; with reduced motion the orb stays still between
// scrolls, so drawing only on scroll is enough.
export const GlobeCanvas = ({ root }: { root: RefObject<HTMLElement | null> }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // undefined = not tried yet; null = no 2D context (jsdom, or a browser that refuses one).
  const scene = useRef<Scene | null | undefined>(undefined);
  const looping = useRef(false);

  useScrollFrame(() => {
    if (!looping.current) drawFrame(ref.current, root.current, scene, 0);
  });

  useEffect(() => {
    if (prefersReducedMotion()) return;
    looping.current = true;
    let frame = 0;
    const tick = (now: number) => {
      drawFrame(ref.current, root.current, scene, now / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      looping.current = false;
      cancelAnimationFrame(frame);
    };
  }, [root]);

  return <canvas ref={ref} aria-hidden="true" className="lp-globe" />;
};
