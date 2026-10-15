import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, InfluentialTermsData } from '../domain/dashboard';
import { fetchDashboard, fetchInfluentialTerms } from '../infrastructure/dashboardApi';
import type { Continent } from '../../sources/domain/source';

export interface UseDashboardReturn {
  data: DashboardData | null;
  terms: InfluentialTermsData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDashboard(
  fechaDesde: string,
  fechaHasta: string,
  continente: Continent | null,
  pais: string | null,
): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [terms, setTerms] = useState<InfluentialTermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, continente, pais };
      const [d, t] = await Promise.all([
        fetchDashboard(params),
        fetchInfluentialTerms(params),
      ]);
      setData(d);
      setTerms(t);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, continente, pais]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, terms, loading, error, reload: load };
}
