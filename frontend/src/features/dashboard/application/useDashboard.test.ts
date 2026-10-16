import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { fetchDashboard, fetchEvolution, fetchGeography, fetchInfluentialNews, fetchInfluentialTerms } from '../infrastructure/dashboardApi';
import type { DashboardData, InfluentialTermsData } from '../domain/dashboard';
import type { Continent } from '../../sources/domain/source';

vi.mock('../infrastructure/dashboardApi', () => ({
  fetchDashboard: vi.fn(),
  fetchInfluentialTerms: vi.fn(),
  fetchEvolution: vi.fn(),
  fetchInfluentialNews: vi.fn(),
  fetchGeography: vi.fn(),
}));

const mockedFetchDashboard = vi.mocked(fetchDashboard);
const mockedFetchInfluentialTerms = vi.mocked(fetchInfluentialTerms);

describe('useDashboard', () => {
  const dummyDashboard: DashboardData = {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-01',
    continente: null,
    pais: null,
    agregados: [
      {
        continente: 'America',
        pais: null,
        humor: 0.25,
        noticias: 10,
        suficiente: true,
      },
    ],
  };

  const dummyTerms: InfluentialTermsData = {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-01',
    continente: null,
    pais: null,
    terminos: [
      {
        id_termino: 1,
        termino: 'esperanza',
        idioma: 'es',
        peso: 5.2,
        aporte_total: 4.8,
        frecuencia: 3,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchGeography).mockResolvedValue(dummyDashboard);
    vi.mocked(fetchEvolution).mockResolvedValue({ fecha_desde: '2026-10-01', fecha_hasta: '2026-10-01', dias: [] });
    vi.mocked(fetchInfluentialNews).mockResolvedValue({ noticias: [] });
  });

  it('fetches dashboard data and influential terms on mount', async () => {
    mockedFetchDashboard.mockResolvedValueOnce(dummyDashboard);
    mockedFetchInfluentialTerms.mockResolvedValueOnce(dummyTerms);

    const { result } = renderHook(() =>
      useDashboard('2026-10-01', '2026-10-01', null, null)
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(dummyDashboard);
    expect(result.current.terms).toEqual(dummyTerms);
    expect(result.current.error).toBeNull();
    expect(mockedFetchDashboard).toHaveBeenCalledWith({
      fecha_desde: '2026-10-01',
      fecha_hasta: '2026-10-01',
      continente: null,
      pais: null,
    });
  });

  it('handles error when fetch fails', async () => {
    mockedFetchDashboard.mockRejectedValueOnce(new Error('Network error'));
    mockedFetchInfluentialTerms.mockResolvedValueOnce(dummyTerms);

    const { result } = renderHook(() =>
      useDashboard('2026-10-01', '2026-10-01', null, null)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('re-fetches when continent or country changes', async () => {
    mockedFetchDashboard.mockResolvedValue(dummyDashboard);
    mockedFetchInfluentialTerms.mockResolvedValue(dummyTerms);

    const { result, rerender } = renderHook<
      ReturnType<typeof useDashboard>,
      { cont: Continent | null; p: string | null }
    >(
      ({ cont, p }) => useDashboard('2026-10-01', '2026-10-01', cont, p),
      { initialProps: { cont: null, p: null } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ cont: 'America', p: 'CL' });

    await waitFor(() => {
      expect(mockedFetchDashboard).toHaveBeenCalledWith({
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-01',
        continente: 'America',
        pais: 'CL',
      });
    });
  });

  it('requests the whole timeline separately from the selected ranking period', async () => {
    mockedFetchDashboard.mockResolvedValue(dummyDashboard);
    mockedFetchInfluentialTerms.mockResolvedValue(dummyTerms);
    const { result } = renderHook(() => useDashboard(
      '2026-10-01', '2026-10-07', 'America', 'CL', '2026-09-08', '2026-10-07',
    ));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchEvolution).toHaveBeenCalledWith({
      fecha_desde: '2026-09-08', fecha_hasta: '2026-10-07', continente: 'America', pais: 'CL',
    });
    expect(fetchInfluentialNews).toHaveBeenCalledWith({
      fecha_desde: '2026-10-01', fecha_hasta: '2026-10-07', continente: 'America', pais: 'CL',
    });
  });

  it('ignores a slow response from an earlier filter selection', async () => {
    let finishFirst!: (data: DashboardData) => void;
    mockedFetchDashboard.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    mockedFetchDashboard.mockResolvedValue({ ...dummyDashboard, continente: 'Europa' });
    mockedFetchInfluentialTerms.mockResolvedValue(dummyTerms);
    const { result, rerender } = renderHook(
      ({ cont }: { cont: Continent | null }) => useDashboard('2026-10-01', '2026-10-01', cont, null),
      { initialProps: { cont: null as Continent | null } },
    );
    rerender({ cont: 'Europa' });
    await waitFor(() => expect(result.current.data?.continente).toBe('Europa'));
    await act(async () => finishFirst(dummyDashboard));
    expect(result.current.data?.continente).toBe('Europa');
    expect(result.current.loading).toBe(false);
  });
});
