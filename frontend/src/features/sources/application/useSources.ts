import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Continent,
  CreateSourceBatchInput,
  ReplaceSourceInput,
  Source,
  SourceStatusFilter,
} from '../domain/source';
import {
  createSources,
  deleteSource,
  fetchSources,
  patchSource,
  replaceSource,
} from '../infrastructure/sourcesApi';
import { groupSourcesByChannel } from './groupSourcesByChannel';

export function useSources(
  continentFilter: Continent | '' = '',
  statusFilter: SourceStatusFilter = 'all',
) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChannelIds, setOpenChannelIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSources();
      setSources(data);
      // Open the first channel by default if available
      if (data.length > 0) {
        setOpenChannelIds((prev) => (prev.size === 0 ? new Set([data[0].channelId]) : prev));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar las fuentes';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (continentFilter && s.channel.continent !== continentFilter) {
        return false;
      }
      if (statusFilter === 'active' && !s.active) {
        return false;
      }
      if (statusFilter === 'inactive' && s.active) {
        return false;
      }
      return true;
    });
  }, [sources, continentFilter, statusFilter]);

  const channelGroups = useMemo(() => {
    return groupSourcesByChannel(filteredSources);
  }, [filteredSources]);

  const toggleChannelOpen = useCallback((channelId: number) => {
    setOpenChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }, []);

  const toggleSourceActive = useCallback(async (sourceId: number) => {
    const target = sources.find((s) => s.id === sourceId);
    if (!target) return;
    const newActive = !target.active;

    // Optimistic update
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, active: newActive } : s)),
    );

    try {
      const updated = await patchSource(sourceId, { active: newActive });
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? updated : s)),
      );
      return updated;
    } catch (err) {
      // Revert optimistic update
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, active: !newActive } : s)),
      );
      throw err;
    }
  }, [sources]);

  const addSourcesBatch = useCallback(async (input: CreateSourceBatchInput) => {
    const res = await createSources(input);
    setSources((prev) => [...res.sources, ...prev]);
    setOpenChannelIds((prev) => new Set(prev).add(res.channel.id));
    return res;
  }, []);

  const updateSourceItem = useCallback(async (id: number, input: ReplaceSourceInput) => {
    const updated = await replaceSource(id, input);
    setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const removeSourceItem = useCallback(async (id: number) => {
    await deleteSource(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sources,
    filteredSources,
    channelGroups,
    openChannelIds,
    loading,
    error,
    toggleChannelOpen,
    toggleSourceActive,
    addSourcesBatch,
    updateSourceItem,
    removeSourceItem,
    reload: load,
  };
}
