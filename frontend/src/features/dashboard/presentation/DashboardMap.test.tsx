import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardMap } from './DashboardMap';
import type { DashboardAggregate } from '../domain/dashboard';

const atlas = {
  type: 'Topology',
  objects: { countries: { type: 'GeometryCollection', geometries: [
    { type: 'Polygon', properties: { name: 'Chile' }, arcs: [[0]] },
    { type: 'Polygon', properties: { name: 'Argentina' }, arcs: [[1]] },
    { type: 'Polygon', properties: { name: 'Spain' }, arcs: [[2]] },
    { type: 'Polygon', properties: { name: 'Russia' }, arcs: [[3]] },
    { type: 'Polygon', properties: { name: 'Senegal' }, arcs: [[4]] },
  ] } },
  arcs: [
    [[-76, -50], [-76, -20], [-70, -20], [-70, -50], [-76, -50]],
    [[-68, -50], [-68, -25], [-55, -25], [-55, -50], [-68, -50]],
    [[-8, 37], [-8, 43], [0, 43], [0, 37], [-8, 37]],
    [[30, 50], [30, 70], [170, 70], [170, 50], [30, 50]],
    [[-17, 12], [-17, 16], [-12, 16], [-12, 12], [-17, 12]],
  ],
};

describe('DashboardMap geography context', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves colored countries and other continents when selecting a country', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const aggregates: DashboardAggregate[] = [
      { continente: 'America', pais: null, humor: 0.1, noticias: 10, suficiente: true },
      { continente: 'Europa', pais: null, humor: 0.2, noticias: 5, suficiente: true },
      { continente: 'America', pais: 'CL', humor: 0.5, noticias: 4, suficiente: true },
      { continente: 'America', pais: 'AR', humor: -0.5, noticias: 6, suficiente: true },
    ];
    const props = { aggregates, continent: 'America' as const, pais: null as string | null,
      onSelectContinent: vi.fn(), onSelectCountry: vi.fn() };
    const { container, rerender } = render(<DashboardMap {...props} />);
    await waitFor(() => expect(container.querySelector('[data-country="AR"]')).toBeInTheDocument());
    const fills = ['CL', 'AR', 'ES'].map((iso) => container.querySelector(`[data-country="${iso}"]`)?.getAttribute('fill'));
    expect(fills.every((fill) => fill && !fill.startsWith('url('))).toBe(true);
    rerender(<DashboardMap {...props} pais="CL" />);
    await waitFor(() => expect(container.querySelector('[data-country="CL"]')).toHaveAttribute('stroke-width', '1.8'));
    expect(['CL', 'AR', 'ES'].map((iso) => container.querySelector(`[data-country="${iso}"]`)?.getAttribute('fill'))).toEqual(fills);
  });

  it('colors and labels any attributed country, not only a fixed list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const aggregates: DashboardAggregate[] = [
      { continente: 'Africa', pais: null, humor: 0.7, noticias: 1, suficiente: false },
      { continente: 'Africa', pais: 'SN', humor: 0.7, noticias: 1, suficiente: false },
    ];
    const { container } = render(<DashboardMap aggregates={aggregates} continent="Africa" pais={null}
      onSelectContinent={vi.fn()} onSelectCountry={vi.fn()} />);
    await waitFor(() => expect(container.querySelector('[data-country="SN"]')).toBeInTheDocument());
    expect(container.querySelector('[data-country="SN"]')?.getAttribute('fill')).not.toMatch(/^url\(/);
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toContain('SN');
  });

  it('draws Russia once per continent, clipped at the Urals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const { container } = render(<DashboardMap aggregates={[]} continent={null} pais={null}
      onSelectContinent={vi.fn()} onSelectCountry={vi.fn()} />);
    await waitFor(() => expect(container.querySelectorAll('[clip-path]')).toHaveLength(2));
    expect([...container.querySelectorAll('[clip-path]')].map((p) => p.getAttribute('clip-path')))
      .toEqual(['url(#clip-ru-eu)', 'url(#clip-ru-as)']);
    expect(container.querySelectorAll('clipPath')).toHaveLength(2);
  });

  it('zooms to the selected continent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const props = { aggregates: [], pais: null, onSelectContinent: vi.fn(), onSelectCountry: vi.fn() };
    const { container, rerender } = render(<DashboardMap {...props} continent={null} />);
    await waitFor(() => expect(container.querySelector('[data-country="ES"]')).toBeInTheDocument());
    const world = container.querySelector('[data-country="ES"]')!.getAttribute('d');
    rerender(<DashboardMap {...props} continent="Europa" />);
    await waitFor(() => expect(container.querySelector('[data-country="ES"]')!.getAttribute('d')).not.toBe(world));
  });

  it('eases country colors to the new day instead of snapping', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const day = (humor: number): DashboardAggregate[] => [
      { continente: 'America', pais: 'CL', humor, noticias: 4, suficiente: true },
    ];
    const props = { continent: 'America' as const, pais: null, onSelectContinent: vi.fn(), onSelectCountry: vi.fn() };
    const fill = (c: HTMLElement) => c.querySelector('[data-country="CL"]')?.getAttribute('fill');
    const target = render(<DashboardMap {...props} aggregates={day(-0.5)} />);
    await waitFor(() => expect(fill(target.container)).toBeTruthy());
    const { container, rerender } = render(<DashboardMap {...props} aggregates={day(0.5)} />);
    await waitFor(() => expect(fill(container)).toBeTruthy());
    const before = fill(container);
    rerender(<DashboardMap {...props} aggregates={day(-0.5)} />);
    expect(fill(container)).toBe(before);
    await waitFor(() => expect(fill(container)).toBe(fill(target.container)));
  });

  it('skips color and zoom animations when the user prefers reduced motion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const day = (humor: number): DashboardAggregate[] => [
      { continente: 'America', pais: 'CL', humor, noticias: 4, suficiente: true },
    ];
    const props = { pais: null, onSelectContinent: vi.fn(), onSelectCountry: vi.fn() };
    const fill = (c: HTMLElement) => c.querySelector('[data-country="CL"]')?.getAttribute('fill');
    const target = render(<DashboardMap {...props} continent="America" aggregates={day(-0.5)} />);
    await waitFor(() => expect(fill(target.container)).toBeTruthy());
    const { container, rerender } = render(<DashboardMap {...props} continent="America" aggregates={day(0.5)} />);
    await waitFor(() => expect(fill(container)).toBeTruthy());
    rerender(<DashboardMap {...props} continent="America" aggregates={day(-0.5)} />);
    expect(fill(container)).toBe(fill(target.container));
    rerender(<DashboardMap {...props} continent={null} aggregates={day(-0.5)} />);
    expect(container.querySelector('svg > g[font-family]')).not.toHaveAttribute('opacity');
    expect(container.querySelector('svg > g')).not.toHaveAttribute('transform');
  });

  it('omits the label of a country colliding with one that has more news, unless selected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => atlas }));
    const aggregates: DashboardAggregate[] = [
      { continente: 'America', pais: 'CL', humor: 0.5, noticias: 4, suficiente: true },
      { continente: 'America', pais: 'AR', humor: -0.5, noticias: 6, suficiente: true },
    ];
    const props = { aggregates, continent: 'America' as const, onSelectContinent: vi.fn(), onSelectCountry: vi.fn() };
    const labels = (c: HTMLElement) => [...c.querySelectorAll('text')].map((t) => t.textContent).filter((t) => t === 'CL' || t === 'AR');
    const { container, rerender } = render(<DashboardMap {...props} pais={null} />);
    await waitFor(() => expect(labels(container)).toEqual(['AR']));
    rerender(<DashboardMap {...props} pais="CL" />);
    await waitFor(() => expect(labels(container)).toEqual(['CL']));
  });
});
