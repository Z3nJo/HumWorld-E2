import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Channel, Source } from '../domain/source';
import * as sourcesApi from '../infrastructure/sourcesApi';
import {
  deriveChannelLanguages,
  groupSourcesByChannel,
} from './groupSourcesByChannel';
import { useSources } from './useSources';

vi.mock('../infrastructure/sourcesApi');

describe('useSources and groupSourcesByChannel', () => {
  const sampleChannels: Channel[] = [
    {
      id: 10,
      name: 'El País',
      continent: 'Europa',
      country: 'ES',
      siteUrl: 'https://elpais.com',
      active: true,
    },
    {
      id: 20,
      name: 'BBC',
      continent: 'Europa',
      country: 'GB',
      siteUrl: 'https://bbc.com',
      active: false,
    },
    {
      id: 30,
      name: 'Sin Feeds',
      continent: 'America',
      country: null,
      siteUrl: null,
      active: true,
    },
  ];

  const sampleSources: Source[] = [
    {
      id: 1,
      channelId: 10,
      name: 'El País · Portada',
      feedUrl: 'https://elpais.com/rss/portada.xml',
      category: 'politics',
      iptcCategory: 'politics',
      language: 'es',
      active: true,
      channel: sampleChannels[0],
    },
    {
      id: 2,
      channelId: 10,
      name: 'El País · Deportes',
      feedUrl: 'https://elpais.com/rss/deportes.xml',
      category: 'sport',
      iptcCategory: 'sport',
      language: 'en',
      active: false,
      channel: sampleChannels[0],
    },
    {
      id: 3,
      channelId: 20,
      name: 'BBC · Mundo',
      feedUrl: 'https://bbc.com/rss/world.xml',
      category: 'conflict/war/peace',
      iptcCategory: 'conflict/war/peace',
      language: 'en',
      active: true,
      channel: sampleChannels[1],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deriveChannelLanguages', () => {
    it('returns empty array when no sources exist', () => {
      expect(deriveChannelLanguages([])).toEqual([]);
    });

    it('returns sorted unique languages', () => {
      expect(deriveChannelLanguages(sampleSources.slice(0, 2))).toEqual(['en', 'es']);
    });
  });

  describe('groupSourcesByChannel', () => {
    it('groups sources under their channels correctly and sorts by id_canal ascending', () => {
      const groups = groupSourcesByChannel(sampleChannels, sampleSources);
      expect(groups).toHaveLength(3);
      // id 10, 20, 30
      expect(groups[0].id).toBe(10);
      expect(groups[0].name).toBe('El País');
      expect(groups[0].sources).toHaveLength(2);
      expect(groups[0].languages).toEqual(['en', 'es']);

      expect(groups[1].id).toBe(20);
      expect(groups[1].name).toBe('BBC');
      expect(groups[1].sources).toHaveLength(1);

      expect(groups[2].id).toBe(30);
      expect(groups[2].name).toBe('Sin Feeds');
      expect(groups[2].sources).toHaveLength(0);
      expect(groups[2].languages).toEqual([]);
    });
  });

  describe('useSources hook', () => {
    it('loads channels and sources in parallel and auto-expands the first channel', async () => {
      vi.mocked(sourcesApi.fetchChannels).mockResolvedValueOnce(sampleChannels);
      vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

      const { result } = renderHook(() => useSources());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(sourcesApi.fetchChannels).toHaveBeenCalledTimes(1);
      expect(sourcesApi.fetchSources).toHaveBeenCalledTimes(1);
      expect(result.current.channels).toHaveLength(3);
      expect(result.current.sources).toHaveLength(3);
      expect(result.current.channelGroups).toHaveLength(3);
      expect(result.current.openChannelIds.has(10)).toBe(true);
    });

    it('filters channelGroups by continent and status', async () => {
      vi.mocked(sourcesApi.fetchChannels).mockResolvedValue(sampleChannels);
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);

      const { result } = renderHook(() => useSources('Europa', 'active'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // El País is active in Europa, BBC is inactive in Europa, Sin Feeds is in America
      expect(result.current.channelGroups).toHaveLength(1);
      expect(result.current.channelGroups[0].name).toBe('El País');
    });

    it('toggles source active state with optimistic update and rollback on failure', async () => {
      vi.mocked(sourcesApi.fetchChannels).mockResolvedValue(sampleChannels);
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
      vi.mocked(sourcesApi.patchSource).mockRejectedValueOnce(new Error('Failed to patch'));

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.toggleSourceActive(1);
        }),
      ).rejects.toThrow('Failed to patch');

      // State is rolled back to true
      const source = result.current.sources.find((s) => s.id === 1);
      expect(source?.active).toBe(true);
    });

    it('toggles channel active state via patchChannel with optimistic update', async () => {
      vi.mocked(sourcesApi.fetchChannels).mockResolvedValue(sampleChannels);
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
      vi.mocked(sourcesApi.patchChannel).mockResolvedValueOnce({
        ...sampleChannels[0],
        active: false,
      });

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const res = await result.current.toggleChannelActive(10);
        expect(res).toEqual({ name: 'El País', active: false });
      });

      expect(sourcesApi.patchChannel).toHaveBeenCalledWith(10, { activo: false });
      const elPais = result.current.channels.find((c) => c.id === 10);
      expect(elPais?.active).toBe(false);
    });

    it('performs sequential diff when calling editSourceBatch', async () => {
      vi.mocked(sourcesApi.fetchChannels).mockResolvedValue(sampleChannels);
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
      vi.mocked(sourcesApi.patchChannel).mockResolvedValueOnce({
        ...sampleChannels[0],
        name: 'El País Renombrado',
      });
      vi.mocked(sourcesApi.patchSource).mockResolvedValue(sampleSources[0]);
      vi.mocked(sourcesApi.createSources).mockResolvedValue({
        channel: sampleChannels[0],
        sources: [sampleSources[0]],
      });
      vi.mocked(sourcesApi.deleteSource).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const existingGroup = result.current.channelGroups[0];

      await act(async () => {
        await result.current.editSourceBatch(
          {
            channelId: 10,
            nombre: 'El País Renombrado',
            url_sitio: 'https://elpais.com',
            continente: 'Europa',
            pais: 'ES',
            idioma: 'en',
            canales: [
              // modified feed #1
              {
                id: 1,
                url_feed: 'https://elpais.com/rss/portada_v2.xml',
                categoria_iptc: 'politics',
              },
              // new feed
              {
                url_feed: 'https://elpais.com/rss/nueva.xml',
                categoria_iptc: 'health',
              },
              // feed #2 omitted -> deleted
            ],
          },
          existingGroup,
        );
      });

      expect(sourcesApi.patchChannel).toHaveBeenCalledWith(10, {
        nombre: 'El País Renombrado',
        continente: 'Europa',
        pais: 'ES',
        url_sitio: 'https://elpais.com',
      });

      expect(sourcesApi.patchSource).toHaveBeenCalledWith(1, expect.objectContaining({
        feedUrl: 'https://elpais.com/rss/portada_v2.xml',
        language: 'en',
      }));

      expect(sourcesApi.createSources).toHaveBeenCalledWith({
        channelId: 10,
        sources: [
          expect.objectContaining({
            feedUrl: 'https://elpais.com/rss/nueva.xml',
            iptcCategory: 'health',
            language: 'en',
          }),
        ],
      });

      expect(sourcesApi.deleteSource).toHaveBeenCalledWith(2);
    });
  });
});
