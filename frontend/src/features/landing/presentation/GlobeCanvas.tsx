import { useEffect, useRef } from 'react';
import { geoOrthographic } from 'd3-geo';
import { createGlobeParticles } from '../domain/globeParticles';

const SIZE = 800;
const DOT_RADIUS = 3.2;

// Static view over the Atlantic; the default clip angle hides the far side.
const PROJECTION = geoOrthographic()
  .translate([SIZE / 2, SIZE / 2])
  .scale(SIZE / 2 - 8)
  .rotate([-20, -15]);

// Decorative layer: the particle globe is drawn here, hidden from assistive tech.
export const GlobeCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Null in jsdom, and in browsers that refuse a context.
    const context = ref.current?.getContext('2d');
    if (!context) return;
    for (const { lon, lat, color } of createGlobeParticles()) {
      const point = PROJECTION([lon, lat]);
      if (!point) continue;
      context.fillStyle = color;
      context.beginPath();
      context.arc(point[0], point[1], DOT_RADIUS, 0, 2 * Math.PI);
      context.fill();
    }
  }, []);

  return <canvas ref={ref} width={SIZE} height={SIZE} aria-hidden="true" className="lp-hero__globe" />;
};
