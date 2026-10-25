import { useRef, type RefObject } from 'react';
import { globeRotation, morphAmount, placeParticle, storyProgress, type GlobeBox, type MapBox } from '../domain/globeScene';
import { createGlobeParticles, type GlobeParticle } from '../domain/globeParticles';
import { useScrollFrame } from './useScrollFrame';

const GLOBE_DOT = 0.008;
const MAP_DOT = 0.0045;
const MAX_RADIUS = 380;

type Scene = { context: CanvasRenderingContext2D; particles: GlobeParticle[] };

const drawParticles = (
  { context, particles }: Scene,
  globe: GlobeBox,
  map: MapBox,
  rotation: [number, number],
  morph: number,
) => {
  const radius = globe.radius * GLOBE_DOT * (1 - morph) + map.width * MAP_DOT * morph;
  for (const particle of particles) {
    const { x, y, alpha } = placeParticle(particle, globe, map, rotation, morph);
    if (alpha <= 0) continue;
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
  }
  context.globalAlpha = 1;
};

// Decorative layer, fixed over the viewport and hidden from assistive tech. One set of
// particles is drawn at the hero (a spinning globe) and at the story's map slot, where
// scrolling reorders them into the flat map. Both anchors are read from the DOM per frame.
export const GlobeCanvas = ({ root }: { root: RefObject<HTMLElement | null> }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // undefined = not tried yet; null = no 2D context (jsdom, or a browser that refuses one).
  const scene = useRef<Scene | null | undefined>(undefined);

  useScrollFrame(() => {
    const canvas = ref.current;
    const page = root.current;
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
    const hero = page.querySelector('#inicio')?.getBoundingClientRect();
    const story = page.querySelector('[data-story]')?.getBoundingClientRect();
    const slot = page.querySelector('[data-map-slot]')?.getBoundingClientRect();

    if (hero && hero.bottom > 0) {
      const radius = Math.min(MAX_RADIUS, width * 0.46);
      const globe = { x: hero.left + hero.width / 2, y: hero.top + hero.height / 2, radius };
      drawParticles(scene.current, globe, { x: 0, y: 0, width: 1 }, rotation, 0);
    }
    if (story && slot && slot.bottom > 0 && slot.top < height) {
      const globe = { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2, radius: slot.height / 2 };
      const morph = morphAmount(storyProgress(story.top, story.height, height));
      drawParticles(scene.current, globe, { x: slot.left, y: slot.top, width: slot.width }, rotation, morph);
    }
  });

  return <canvas ref={ref} aria-hidden="true" className="lp-globe" />;
};
