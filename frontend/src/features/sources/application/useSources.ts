import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IPTC_CATEGORY_LABELS,
  type Channel,
  type ChannelWithSources,
  type Continent,
  type CreateSourceBatchInput,
  type IptcCategory,
  type Language,
  type RssSource,
  type SourceStatusFilter,
} from '../domain/source';
import {
  createSources,
  deleteChannel,
  deleteSource,
  fetchChannels,
  fetchSources,
  patchChannel,
  patchSource,
} from '../infrastructure/sourcesApi';
import { groupSourcesByChannel } from './groupSourcesByChannel';

export interface EditSourceDrawerInput {
  channelId: number;
  nombre: string;
  url_sitio: string;
  continente: Continent;
  pais: string | null;
  idioma: 'es' | 'en' | 'mixed';
  canales: Array<{
    id?: number;
    url_feed: string;
    categoria_iptc: IptcCategory;
  }>;
}

export function useSources(
  continentFilter: Continent | '' = '',
  statusFilter: SourceStatusFilter = 'all',
) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sources, setSources] = useState<RssSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChannelIds, setOpenChannelIds] = useState<Set<number>>(new Set());
  const initializedOpenRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelsData, sourcesData] = await Promise.all([
        fetchChannels(),
        fetchSources(),
      ]);
      setChannels(channelsData);
      setSources(sourcesData);

      // Expand the first channel upon initial load
      if (!initializedOpenRef.current && channelsData.length > 0) {
        const sorted = [...channelsData].sort((a, b) => a.id - b.id);
        setOpenChannelIds(new Set([sorted[0].id]));
        initializedOpenRef.current = true;
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

  // Group all channels and sources
  const allGroups = useMemo(() => {
    return groupSourcesByChannel(channels, sources);
  }, [channels, sources]);

  // Apply filters locally over allGroups
  const channelGroups: ChannelWithSources[] = useMemo(() => {
    return allGroups.filter((g) => {
      if (continentFilter && g.continent !== continentFilter) {
        return false;
      }
      if (statusFilter === 'active' && !g.active) {
        return false;
      }
      if (statusFilter === 'inactive' && g.active) {
        return false;
      }
      return true;
    });
  }, [allGroups, continentFilter, statusFilter]);

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

  // Toggle channel (medio) activo switch with optimistic update & rollback
  const toggleChannelActive = useCallback(
    async (channelId: number) => {
      const target = channels.find((c) => c.id === channelId);
      if (!target) return;
      const newActive = !target.active;

      // Optimistic update
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, active: newActive } : c)),
      );

      try {
        await patchChannel(channelId, { activo: newActive });
        return { name: target.name, active: newActive };
      } catch (err) {
        // Rollback
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, active: !newActive } : c)),
        );
        throw err;
      }
    },
    [channels],
  );

  // Toggle feed activo switch with optimistic update & rollback
  const toggleSourceActive = useCallback(
    async (sourceId: number) => {
      const target = sources.find((s) => s.id === sourceId);
      if (!target) return;
      const newActive = !target.active;

      // Optimistic update
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, active: newActive } : s)),
      );

      try {
        await patchSource(sourceId, { active: newActive });
        return { name: target.name, active: newActive };
      } catch (err) {
        // Rollback
        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, active: !newActive } : s)),
        );
        throw err;
      }
    },
    [sources],
  );

  // Create new source batch (POST /sources)
  const addSourcesBatch = useCallback(
    async (input: CreateSourceBatchInput) => {
      const res = await createSources(input);
      await load();
      setOpenChannelIds((prev) => new Set(prev).add(res.channel.id));
      return res;
    },
    [load],
  );

  // Edit existing source by sequential diff
  const editSourceBatch = useCallback(
    async (input: EditSourceDrawerInput, existingGroup: ChannelWithSources) => {
      // 1. Diff channel
      const channelChanged =
        input.nombre.trim() !== existingGroup.name ||
        (input.url_sitio.trim() || null) !== existingGroup.siteUrl ||
        input.continente !== existingGroup.continent ||
        input.pais !== existingGroup.country;

      if (channelChanged) {
        await patchChannel(existingGroup.id, {
          nombre: input.nombre.trim(),
          continente: input.continente,
          pais: input.pais,
          url_sitio: input.url_sitio.trim() || null,
        });
      }

      // 2. Diff feeds
      const currentFeeds = existingGroup.sources;
      const updatedFeedIds = new Set(
        input.canales.filter((c) => c.id !== undefined).map((c) => c.id as number),
      );

      // 2a. PATCH modified existing feeds
      for (const canal of input.canales) {
        if (canal.id !== undefined) {
          const original = currentFeeds.find((f) => f.id === canal.id);
          if (original) {
            const feedUrlChanged = canal.url_feed.trim() !== original.feedUrl;
            const categoryChanged = canal.categoria_iptc !== original.category;
            const languageChanged =
              input.idioma !== 'mixed' && input.idioma !== original.language;

            if (feedUrlChanged || categoryChanged || languageChanged) {
              const patchPayload: {
                name?: string;
                feedUrl?: string;
                iptcCategory?: IptcCategory;
                language?: Language;
              } = {};
              if (categoryChanged || input.nombre.trim() !== existingGroup.name) {
                const label = IPTC_CATEGORY_LABELS[canal.categoria_iptc] || canal.categoria_iptc;
                patchPayload.name = `${input.nombre.trim()} · ${label}`.slice(0, 150);
              }
              if (feedUrlChanged) patchPayload.feedUrl = canal.url_feed.trim();
              if (categoryChanged) patchPayload.iptcCategory = canal.categoria_iptc;
              if (languageChanged) patchPayload.language = input.idioma as Language;

              await patchSource(canal.id, patchPayload);
            }
          }
        }
      }

      // 2b. POST newly added feeds
      const newFeeds = input.canales.filter((c) => c.id === undefined);
      if (newFeeds.length > 0) {
        await createSources({
          channelId: existingGroup.id,
          sources: newFeeds.map((f) => ({
            name: `${input.nombre.trim()} · ${f.categoria_iptc}`.slice(0, 150),
            feedUrl: f.url_feed.trim(),
            iptcCategory: f.categoria_iptc,
            language: input.idioma === 'mixed' ? 'es' : input.idioma,
            active: true,
          })),
        });
      }

      // 2c. DELETE removed feeds
      const removedFeeds = currentFeeds.filter((f) => !updatedFeedIds.has(f.id));
      for (const removed of removedFeeds) {
        await deleteSource(removed.id);
      }

      await load();
    },
    [load],
  );

  // Deactivate channel (DELETE /channels/{id})
  const deactivateChannelGroup = useCallback(
    async (channelId: number) => {
      await deleteChannel(channelId);
      await load();
    },
    [load],
  );

  return {
    channels,
    sources,
    channelGroups,
    openChannelIds,
    loading,
    error,
    toggleChannelOpen,
    toggleSourceActive,
    toggleGroupActive: toggleChannelActive,
    toggleChannelActive,
    addSourcesBatch,
    editSourceBatch,
    deactivateChannelGroup,
    reload: load,
  };
}
