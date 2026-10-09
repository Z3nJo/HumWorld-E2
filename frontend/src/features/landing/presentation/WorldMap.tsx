import { useId } from 'react';
// The /core entry skips the zoom bundle (d3-zoom, d3-selection), ~40 kB the landing never uses.
import { ComposableMap, Geographies, Geography, Graticule, Sphere } from 'react-simple-maps/core';
import type { GeographiesProps } from 'react-simple-maps/core';
import { geoCentroid, geoNaturalEarth1 } from 'd3-geo';
import { scaleLinear } from 'd3-scale';
import countries from 'world-atlas/countries-110m.json';
import { continentOf, type Continent } from '../domain/continent';
import { HUMOR_STOPS } from '../domain/humorScale';
import './WorldMap.css';

const WIDTH = 800;
const HEIGHT = 400;

// react-simple-maps parses TopoJSON at runtime, but its prop type only names GeoJSON.
const WORLD = countries as unknown as GeographiesProps['geography'];

// Natural Earth fitted to the 2:1 box, leaving 2px around the globe outline.
const PROJECTION = geoNaturalEarth1().fitExtent(
  [[2, 2], [WIDTH - 2, HEIGHT - 2]],
  { type: 'Sphere' },
);

const colorOf = scaleLinear<string>()
  .domain(HUMOR_STOPS.map(({ value }) => value))
  .range(HUMOR_STOPS.map(({ color }) => color))
  .clamp(true);

type Features = Parameters<NonNullable<GeographiesProps['parseGeographies']>>[0];

// Runs once when the topology is parsed, not on every heartbeat.
const withContinent = (features: Features) =>
  features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      continent: continentOf(feature.properties?.name, geoCentroid(feature)),
    },
  }));

// Hand-picked [lon, lat] near each inhabited continent's visual center, projected once.
const PULSES = (
  [
    ['America', [-80, 12]],
    ['Europa', [15, 50]],
    ['Africa', [20, 5]],
    ['Asia', [90, 40]],
    ['Oceania', [135, -25]],
  ] as const
).map(([continent, lonLat]) => ({ continent, at: PROJECTION([...lonLat])! }));

type WorldMapProps = { values: Record<Continent, number>; variant: 'hero' | 'card' };

export const WorldMap = ({ values, variant }: WorldMapProps) => (
  <ComposableMap
    width={WIDTH}
    height={HEIGHT}
    projection={PROJECTION}
    aria-hidden="true"
    className={`lp-map lp-map--${variant}`}
  >
    {/* Unique id: the sphere emits a clipPath and the page renders two maps. */}
    <Sphere id={useId()} className="lp-map__sphere" />
    {variant === 'hero' && <Graticule className="lp-map__graticule" />}
    <Geographies geography={WORLD} parseGeographies={withContinent}>
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            // The library makes every country tabbable; undefined drops the attribute.
            tabIndex={undefined}
            className="lp-map__country"
            style={{ fill: colorOf(values[geo.properties?.continent as Continent]) }}
          />
        ))
      }
    </Geographies>
    {variant === 'hero' &&
      PULSES.map(({ continent, at: [cx, cy] }) => (
        // Keyed by value: a heartbeat remounts the circle, which replays its CSS ripple.
        <circle
          key={`${continent}:${values[continent]}`}
          cx={cx}
          cy={cy}
          r={14}
          className="lp-map__pulse"
          style={{ stroke: colorOf(values[continent]) }}
        />
      ))}
  </ComposableMap>
);
