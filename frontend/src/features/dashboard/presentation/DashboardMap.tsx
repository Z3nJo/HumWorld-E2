import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { DashboardAggregate } from '../domain/dashboard';
import type { Continent } from '../../sources/domain/source';
import {
  COUNTRIES_BY_ISO,
  TOPO_TO_ISO,
  CONTINENT_ANCHORS,
  CONTINENT_OVERRIDES,
  formatHumor,
} from '../domain/countries';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

export interface CountryProperties {
  name: string;
  cont?: Continent;
}

export type CountryFeature = Feature<Geometry, CountryProperties>;
export type WorldFeatureCollection = FeatureCollection<Geometry, CountryProperties>;

let cachedWorld: WorldFeatureCollection | null = null;

const colorScale = d3
  .scaleLinear<string>()
  .domain([-1, -0.5, 0, 0.5, 1])
  .range(['#bf4f22', '#e2a383', '#e6e0d2', '#93b1d6', '#285f9f'])
  .interpolate(d3.interpolateLab)
  .clamp(true);

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
        { type: 'Sphere' }
      );
      const path = d3.geoPath(proj);

      d3.select(el).selectAll('svg').remove();

      const svg = d3
        .select(el)
        .append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .attr('role', 'img')
        .attr('aria-label', 'Mapa de humor por continente y país');

      const defs = svg.append('defs');

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
      svg.append('path').datum<d3.GeoPermissibleObjects>({ type: 'Sphere' }).attr('d', path).attr('fill', '#f0ece3').attr('stroke', '#d9d2c3');

      // Graticule
      svg
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

      // Country paths
      svg
        .append('g')
        .selectAll('path')
        .data(world.features)
        .join('path')
        .attr('class', 'clickable')
        .attr('d', path)
        .attr('fill', getFill)
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
          const countryName = iso ? COUNTRIES_BY_ISO[iso]?.es : f.properties.name;
          const isSameContinent = continent === f.properties.cont;
          const label = isSameContinent ? (countryName || f.properties.name) : ((f.properties.cont ?? '') as string);

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

      // Provisional overlay pattern
      svg
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

      if (continent) {
        // Show labels for countries with data in this continent
        const contCountries = aggregates.filter(
          (a) => a.pais && COUNTRIES_BY_ISO[a.pais]?.cont === continent
        );

        contCountries.forEach((p) => {
          if (!p.pais) return;
          const info = COUNTRIES_BY_ISO[p.pais];
          if (!info) return;
          const feat = world.features.find((f: CountryFeature) => f.properties.name === info.topo);
          if (!feat) return;
          const centroid = path.centroid(feat);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

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
