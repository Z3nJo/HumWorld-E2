import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { fetchDashboard, fetchInfluentialTerms } from '../infrastructure/dashboardApi';
import type { DashboardData, InfluentialTermsData } from '../domain/dashboard';

vi.mock('../infrastructure/dashboardApi', () => ({
  fetchDashboard: vi.fn(),
  fetchInfluentialTerms: vi.fn(),
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

    const { result, rerender } = renderHook(
      ({ cont, p }) => useDashboard('2026-10-01', '2026-10-01', cont, p),
      { initialProps: { cont: null as any, p: null as any } }
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
});
