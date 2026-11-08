import { useCallback, useEffect, useState } from 'react';
import type { NewsBreakdown } from '../domain/dashboard';
import { fetchNewsBreakdown } from '../infrastructure/dashboardApi';

export function useNewsBreakdown(newsId: number) {
  const [data, setData] = useState<NewsBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchNewsBreakdown(newsId).then(
      (result) => { if (!cancelled) setData(result); },
      (err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el desglose'); },
    );
    return () => { cancelled = true; };
  }, [newsId, attempt]);

  // The panel mounts once per opening, so state only needs resetting on an explicit retry.
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  return { data, error, loading: data === null && error === null, retry };
}
