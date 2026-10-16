import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData, DashboardEvolutionData, InfluentialNewsData, InfluentialTermsData } from '../domain/dashboard';
import { fetchDashboard, fetchEvolution, fetchGeography, fetchInfluentialNews, fetchInfluentialTerms } from '../infrastructure/dashboardApi';
import type { Continent } from '../../sources/domain/source';

export interface UseDashboardReturn {
  data: DashboardData | null;
  geography: DashboardData | null;
  terms: InfluentialTermsData | null;
  evolution: DashboardEvolutionData | null;
  news: InfluentialNewsData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDashboard(
  fechaDesde: string,
  fechaHasta: string,
  continente: Continent | null,
  pais: string | null,
  timelineFrom: string = fechaDesde,
  timelineTo: string = fechaHasta,
): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [geography, setGeography] = useState<DashboardData | null>(null);
  const [terms, setTerms] = useState<InfluentialTermsData | null>(null);
  const [evolution, setEvolution] = useState<DashboardEvolutionData | null>(null);
  const [news, setNews] = useState<InfluentialNewsData | null>(null);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, continente, pais };
      const [d, t, e, n, g] = await Promise.all([
        fetchDashboard(params),
        fetchInfluentialTerms(params),
        fetchEvolution({ ...params, fecha_desde: timelineFrom, fecha_hasta: timelineTo }),
        fetchInfluentialNews(params),
        fetchGeography({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      ]);
      if (id !== requestId.current) return;
      setData(d);
      setGeography(g);
      setTerms(t);
      setEvolution(e);
      setNews(n);
    } catch (err) {
      if (id !== requestId.current) return;
      const msg = err instanceof Error ? err.message : 'Error al cargar el dashboard';
      setError(msg);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fechaDesde, fechaHasta, continente, pais, timelineFrom, timelineTo]);

  useEffect(() => {
    const sequence = requestId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { sequence.current++; };
  }, [load]);

  return { data, geography, terms, evolution, news, loading, error, reload: load };
}
