import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { DashboardAggregate } from '../domain/dashboard';
import type { Continent } from '../../sources/domain/source';
import {
  countryName,
  TOPO_TO_ISO,
  CONTINENT_ANCHORS,
  CONTINENT_EXTENTS,
  CONTINENT_OVERRIDES,
  formatHumor,
} from '../domain/countries';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

export interface CountryProperties {
  name: string;
  cont?: Continent;
  clip?: string;
}

export type CountryFeature = Feature<Geometry, CountryProperties>;
export type WorldFeatureCollection = FeatureCollection<Geometry, CountryProperties>;

let cachedWorld: WorldFeatureCollection | null = null;

const colorScale = d3
  .scaleLinear<string>()
  .domain([-1, -0.5, 0, 0.5, 1])
  .range(['#bf4f22', '#e2a383', '#e6e0d2', '#9cc4a8', '#357050'])
  .interpolate(d3.interpolateLab)
  .clamp(true);

// Russia spans two continents: its geometry is drawn twice, each copy clipped to its side of the Urals (~60°E).
const RUSSIA_PARTS = [
  { cont: 'Europa', clip: 'clip-ru-eu', boxes: [[[18, 30], [60, 85]]] },
  { cont: 'Asia', clip: 'clip-ru-as', boxes: [[[60, 30], [180, 85]], [[-180, 30], [-160, 85]]] },
] as const;

function determineContinent(feature: CountryFeature): Continent {
  const name = feature.properties?.name;
  if (name && CONTINENT_OVERRIDES[name]) {
    return CONTINENT_OVERRIDES[name];
  }
  const [lon, lat] = d3.geoCentroid(feature);
  if (lat < -60) return 'Antartida';
  if (lon < -25) return 'America';
  if ((lon > 110 && lat < -10) || (lon > 130 && lat < 0)) return 'Oceania';
  if (lat >= 36 && lon >= -25 && lon < 60) return 'Europa';
  if (lon > 34 && lat > 12 && lat < 36) return 'Asia';
  if (lon >= -25 && lon < 52 && lat < 36) return 'Africa';
  return 'Asia';
}

interface DashboardMapProps {
  aggregates: DashboardAggregate[];
  continent: Continent | null;
  pais: string | null;
  onSelectContinent: (continent: Continent | null) => void;
  onSelectCountry: (country: string | null) => void;
  onToast?: (title: string, msg: string) => void;
}

export const DashboardMap: React.FC<DashboardMapProps> = ({
  aggregates,
  continent,
  pais,
  onSelectContinent,
  onSelectCountry,
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // Projection of the previous render, so the new view can start where the old one ended.
  const prevView = useRef<{ scale: number; translate: [number, number]; w: number } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function render() {
      const el = containerRef.current;
      if (!el) return;

      if (!cachedWorld) {
        try {
          const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
          const atlas = (await resp.json()) as Topology<{ countries: GeometryCollection<CountryProperties> }>;
          const feat = topojson.feature(atlas, atlas.objects.countries) as unknown as WorldFeatureCollection;
          feat.features.forEach((f: CountryFeature) => {
            f.properties.cont = determineContinent(f);
          });
          feat.features = feat.features.flatMap((f: CountryFeature) =>
            f.properties.name === 'Russia'
              ? RUSSIA_PARTS.map(({ cont, clip }) => ({ ...f, properties: { ...f.properties, cont, clip } }))
              : [f]
          );
          cachedWorld = feat;
        } catch {
          if (!isCancelled && el) {
            el.innerHTML = '<div class="errbox"><b>No se pudo cargar la geometría del mapa</b></div>';
          }
          return;
        }
      }

      if (isCancelled || !containerRef.current || !cachedWorld) return;
      const world = cachedWorld;

      // Group aggregates by continent and country
      const contAggs: Record<string, DashboardAggregate> = {};
      const countryAggs: Record<string, DashboardAggregate> = {};

      aggregates.forEach((a) => {
        if (a.pais) {
          countryAggs[a.pais] = a;
        } else {
          contAggs[a.continente] = a;
        }
      });

      const w = el.clientWidth || 800;
      const h = Math.round(w * 0.5);

      const proj = d3.geoNaturalEarth1().fitExtent(
        [
          [2, 2],
          [w - 2, h - 2],
        ],
        continent ? d3.geoGraticule().extent(CONTINENT_EXTENTS[continent]).outline() : { type: 'Sphere' }
      );
      const path = d3.geoPath(proj);

      // Both views are the same projection at a different scale/offset: start the new drawing
      // transformed to look like the previous view and ease it to identity (a zoom, no redraw jump).
      const prev = prevView.current;
      const scale = proj.scale();
      const translate = proj.translate();
      prevView.current = { scale, translate, w };
      const k = prev && prev.w === w ? prev.scale / scale : 1;
      // Reduced motion: zoom and colors jump straight to the final view.
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const animate = k !== 1 && !!prev && !reduceMotion;

      // Previous fills by feature index (the feature order is stable), so the new colors can ease in.
      const prevFills = reduceMotion
        ? []
        : d3
            .select(el)
            .selectAll<SVGPathElement, unknown>('path.clickable')
            .nodes()
            .map((node) => node.getAttribute('fill'));

      d3.select(el).selectAll('svg').remove();

      const svg = d3
        .select(el)
        .append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .attr('role', 'img')
        .attr('aria-label', 'Mapa de humor por continente y país');

      const defs = svg.append('defs');
      const view = svg.append('g');
      if (animate && prev) {
        // attrTween on numbers: the default transform interpolation needs SVG DOM APIs jsdom lacks.
        const from = [prev.translate[0] - translate[0] * k, prev.translate[1] - translate[1] * k, k];
        const mix = d3.interpolateArray(from, [0, 0, 1]);
        view
          .transition()
          .duration(700)
          .ease(d3.easeCubicInOut)
          .attrTween('transform', () => (t) => {
            const [x, y, z] = mix(t);
            return `translate(${x},${y}) scale(${z})`;
          });
      }

      RUSSIA_PARTS.forEach(({ clip, boxes }) => {
        const cp = defs.append('clipPath').attr('id', clip);
        boxes.forEach((extent) => cp.append('path').attr('d', path(d3.geoGraticule().extent(extent as [[number, number], [number, number]]).outline())));
      });

      // Pattern without data (hatch)
      const hp = defs
        .append('pattern')
        .attr('id', 'hnd')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      hp.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#ece7dc');
      hp.append('rect').attr('width', 1.4).attr('height', 6).attr('fill', '#c3baa7');

      // Pattern provisional
      const pp = defs
        .append('pattern')
        .attr('id', 'hpr')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pp.append('rect').attr('width', 2.2).attr('height', 6).attr('fill', '#fff').attr('opacity', 0.85);

      // Sphere base
      view.append('path').datum<d3.GeoPermissibleObjects>({ type: 'Sphere' }).attr('d', path).attr('fill', '#f0ece3').attr('stroke', '#d9d2c3');

      // Graticule
      view
        .append('path')
        .datum<d3.GeoPermissibleObjects>(d3.geoGraticule10())
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#e2dccf')
        .attr('stroke-width', 0.5);

      const getDatum = (f: CountryFeature): DashboardAggregate | null => {
        if (continent && f.properties.cont === continent) {
          const iso = TOPO_TO_ISO[f.properties.name];
          return iso ? countryAggs[iso] || null : null;
        }
        return f.properties.cont ? contAggs[f.properties.cont] || null : null;
      };

      const getFill = (f: CountryFeature): string => {
        const d = getDatum(f);
        return d && d.noticias > 0 && d.humor !== null ? colorScale(d.humor) : 'url(#hnd)';
      };

      const tip = d3.select(tipRef.current);

      // Hatch patterns cannot be interpolated, so only color-to-color changes start from the old fill.
      const isColor = (fill: string | null | undefined): fill is string => !!fill && !fill.startsWith('url(');
      const startFill = (f: CountryFeature, i: number): string => {
        const from = prevFills[i];
        const to = getFill(f);
        return isColor(from) && isColor(to) ? from : to;
      };

      // Country paths
      const countries = view
        .append('g')
        .selectAll('path')
        .data(world.features)
        .join('path')
        .attr('class', 'clickable')
        .attr('data-country', (f: CountryFeature) => TOPO_TO_ISO[f.properties.name] || '')
        .attr('d', path)
        .attr('clip-path', (f: CountryFeature) => (f.properties.clip ? `url(#${f.properties.clip})` : null))
        .attr('fill', startFill)
        .attr('stroke', (f: CountryFeature) => {
          const iso = TOPO_TO_ISO[f.properties.name];
          return pais && iso === pais ? '#1c1f26' : '#fcfbf7';
        })
        .attr('stroke-width', (f: CountryFeature) => {
          const iso = TOPO_TO_ISO[f.properties.name];
          return pais && iso === pais ? 1.8 : 0.5;
        })
        .attr('opacity', (f: CountryFeature) => {
          return continent && f.properties.cont !== continent ? 0.35 : 1;
        })
        .style('cursor', 'pointer')
        .on('mousemove', (e: MouseEvent, f: CountryFeature) => {
          const d = getDatum(f);
          const [x, y] = d3.pointer(e, el);
          const iso = TOPO_TO_ISO[f.properties.name];
          const isSameContinent = continent === f.properties.cont;
          const label = isSameContinent ? (iso ? countryName(iso) : f.properties.name) : ((f.properties.cont ?? '') as string);

          tip
            .style('display', 'block')
            .style('left', `${x}px`)
            .style('top', `${y}px`)
            .html(
              `<b>${label}</b>${
                d && d.noticias > 0
                  ? `humor ${formatHumor(d.humor)} \u00b7 ${d.noticias} noticias${
                      d.suficiente ? '' : ' \u00b7 provisional'
                    }`
                  : isSameContinent && !iso
                  ? 'sin fuentes RSS asociadas'
                  : 'sin datos'
              }`
            );
        })
        .on('mouseleave', () => {
          tip.style('display', 'none');
        })
        .on('click', (_e: MouseEvent, f: CountryFeature) => {
          const c = f.properties.cont as Continent;
          const iso = TOPO_TO_ISO[f.properties.name];

          if (continent !== c) {
            onSelectContinent(c);
            onSelectCountry(null);
          } else if (iso) {
            onSelectCountry(pais === iso ? null : iso);
          } else {
            if (onToast) {
              onToast('—', `${f.properties.name}: sin fuentes RSS asociadas`);
            }
          }
        });

      countries
        .filter((f: CountryFeature, i: number) => startFill(f, i) !== getFill(f))
        .transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .attr('fill', getFill);

      // Provisional overlay pattern
      view
        .append('g')
        .attr('pointer-events', 'none')
        .selectAll('path')
        .data(
          world.features.filter((f: CountryFeature) => {
            const d = getDatum(f);
            return (
              d &&
              d.noticias > 0 &&
              !d.suficiente &&
              !(continent && f.properties.cont !== continent)
            );
          })
        )
        .join('path')
        .attr('d', path)
        .attr('clip-path', (f: CountryFeature) => (f.properties.clip ? `url(#${f.properties.clip})` : null))
        .attr('fill', 'url(#hpr)')
        .attr('stroke', '#1c1f26')
        .attr('stroke-dasharray', '3 2')
        .attr('stroke-width', 0.8);

      // Numeric Labels overlay
      const lab = svg
        .append('g')
        .attr('pointer-events', 'none')
        .attr('font-family', 'IBM Plex Mono')
        .attr('text-anchor', 'middle')
        .attr('paint-order', 'stroke')
        .attr('stroke', '#fcfbf7')
        .attr('stroke-width', 3.5)
        .attr('stroke-linejoin', 'round');
      // Labels sit at final positions, so they wait for the zoom to land.
      if (animate) lab.attr('opacity', 0).transition().delay(450).duration(300).attr('opacity', 1);

      if (continent) {
        // Show labels for countries with data in this continent
        // Selected country first, then by news count; skip a label that collides with one already drawn.
        const contCountries = aggregates
          .filter((a) => a.pais && a.continente === continent)
          .sort((a, b) => Number(b.pais === pais) - Number(a.pais === pais) || b.noticias - a.noticias);
        const drawn: [number, number][] = [];

        contCountries.forEach((p) => {
          if (!p.pais) return;
          const feat = world.features.find(
            (f: CountryFeature) => TOPO_TO_ISO[f.properties.name] === p.pais && f.properties.cont === continent
          );
          if (!feat) return;
          const centroid = path.centroid(feat);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
          if (drawn.some(([x, y]) => Math.abs(x - centroid[0]) < 40 && Math.abs(y - centroid[1]) < 30)) return;
          drawn.push([centroid[0], centroid[1]]);

          const g = lab.append('g').attr('transform', `translate(${centroid[0]},${centroid[1]})`);
          g.append('text')
            .attr('y', -9)
            .attr('font-size', 10)
            .attr('font-weight', 500)
            .attr('letter-spacing', '.08em')
            .attr('fill', '#40454f')
            .text(p.pais);

          g.append('text')
            .attr('y', 9)
            .attr('font-family', 'Newsreader')
            .attr('font-size', 15)
            .attr('font-weight', 500)
            .attr('fill', '#1c1f26')
            .text(p.noticias ? formatHumor(p.humor) : 'sin datos');
        });
      } else {
        // Show labels for all continents
        const contList: Continent[] = ['America', 'Europa', 'Africa', 'Asia', 'Oceania', 'Antartida'];
        contList.forEach((cKey) => {
          const anchor = CONTINENT_ANCHORS[cKey];
          if (!anchor) return;
          const xy = proj(anchor);
          if (!xy) return;
          const d = contAggs[cKey];

          const g = lab.append('g').attr('transform', `translate(${xy[0]},${xy[1]})`);
          g.append('text')
            .attr('y', -9)
            .attr('font-size', 10.5)
            .attr('font-weight', 500)
            .attr('letter-spacing', '.08em')
            .attr('fill', '#40454f')
            .text(cKey.toUpperCase());

          g.append('text')
            .attr('y', 9)
            .attr('font-family', 'Newsreader')
            .attr('font-size', 19)
            .attr('font-weight', 500)
            .attr('fill', '#1c1f26')
            .text(d && d.noticias ? formatHumor(d.humor) : 'sin datos');

          g.append('text')
            .attr('y', 22)
            .attr('font-size', 10)
            .attr('fill', '#61656e')
            .text(d && d.noticias ? `${d.noticias} not.${d.suficiente ? '' : ' · prov.'}` : '0 not.');
        });
      }
    }

    void render();

    return () => {
      isCancelled = true;
    };
  }, [aggregates, continent, pais, onSelectContinent, onSelectCountry, onToast]);

  return (
    <div style={{ position: 'relative' }}>
      <div className="mapwrap" ref={containerRef} id="map" />
      <div
        ref={tipRef}
        className="map-tip"
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
};
