import { useEffect, useState } from 'react';
import type { InfluentialNews, InfluentialTerm } from '../../dashboard/domain/dashboard';
import { fetchDashboard, fetchInfluentialNews, fetchInfluentialTerms } from '../../dashboard/infrastructure/dashboardApi';
import type { ContinentValues } from '../domain/humorScale';
import { continentValues } from '../domain/todayPreview';

export type TodayPreview = {
  date: string;
  values: ContinentValues;
  terms: InfluentialTerm[];
  news: InfluentialNews[];
};

// Today's real numbers for the panel preview, or null while loading, on any failure, or when
// no continent has data yet: the landing then keeps its illustrative samples.
export const useTodayPreview = (): TodayPreview | null => {
  const [preview, setPreview] = useState<TodayPreview | null>(null);

  useEffect(() => {
    let active = true;
    const date = new Date().toISOString().slice(0, 10);
    const params = { fecha_desde: date, fecha_hasta: date };
    Promise.all([fetchDashboard(params), fetchInfluentialTerms(params), fetchInfluentialNews(params)])
      .then(([dashboard, terms, news]) => {
        const values = continentValues(dashboard.agregados);
        if (active && values) setPreview({ date, values, terms: terms.terminos, news: news.noticias });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return preview;
};
