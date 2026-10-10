import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Source } from '../domain/source';
import * as sourcesApi from '../infrastructure/sourcesApi';
import { groupSourcesByChannel } from './groupSourcesByChannel';
import { useSources } from './useSources';

vi.mock('../infrastructure/sourcesApi');

describe('useSources and groupSourcesByChannel', () => {
  const sampleSources: Source[] = [
    {
      id: 1,
      channelId: 10,
      name: 'Portada',
      feedUrl: 'https://elpais.com/rss/portada.xml',
      iptcCategory: 'politics',
      language: 'es',
      active: true,
      channel: { id: 10, name: 'El País', continent: 'Europa' },
    },
    {
      id: 2,
      channelId: 10,
      name: 'Deportes',
      feedUrl: 'https://elpais.com/rss/deportes.xml',
      iptcCategory: 'sport',
      language: 'es',
      active: false,
      channel: { id: 10, name: 'El País', continent: 'Europa' },
    },
    {
      id: 3,
      channelId: 20,
      name: 'World News',
      feedUrl: 'https://bbc.com/rss/world.xml',
      iptcCategory: 'conflict/war/peace',
      language: 'en',
      active: true,
      channel: { id: 20, name: 'BBC', continent: 'Europa' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupSourcesByChannel', () => {
    it('groups sources under their channels correctly and counts actives', () => {
      const groups = groupSourcesByChannel(sampleSources);
      expect(groups).toHaveLength(2);
      // Sorted alphabetically: BBC then El País
      expect(groups[0].name).toBe('BBC');
      expect(groups[0].sources).toHaveLength(1);
      expect(groups[0].activeCount).toBe(1);

      expect(groups[1].name).toBe('El País');
      expect(groups[1].sources).toHaveLength(2);
      expect(groups[1].activeCount).toBe(1);
    });
  });

  describe('useSources hook', () => {
    it('loads sources and provides channel groups', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

      const { result } = renderHook(() => useSources());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sources).toHaveLength(3);
      expect(result.current.channelGroups).toHaveLength(2);
      expect(result.current.openChannelIds.size).toBe(0);
    });

    it('filters sources by continent and status', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

      const { result } = renderHook(() => useSources('Europa', 'active'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.filteredSources).toHaveLength(2);
      expect(result.current.filteredSources.every((s) => s.active)).toBe(true);
    });

    it('toggles source active state with optimistic update and patch call', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);
      vi.mocked(sourcesApi.patchSource).mockResolvedValueOnce({
        ...sampleSources[0],
        active: false,
      });

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleSourceActive(1);
      });

      expect(sourcesApi.patchSource).toHaveBeenCalledWith(1, { active: false });
      const updated = result.current.sources.find((s) => s.id === 1);
      expect(updated?.active).toBe(false);
    });

    it('toggles group active state sequentially for all feeds and reloads', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
      vi.mocked(sourcesApi.patchSource).mockResolvedValue({
        ...sampleSources[0],
        active: false,
      });

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // El País (id 10) has 2 feeds (ids 1 and 2), and isActive is true because feed 1 is active
      const elPaisGroup = result.current.channelGroups.find((g) => g.id === 10);
      expect(elPaisGroup?.isActive).toBe(true);

      await act(async () => {
        const res = await result.current.toggleGroupActive(10);
        expect(res).toEqual({ groupName: 'El País', active: false });
      });

      // Called for both feeds sequentially with active: false
      expect(sourcesApi.patchSource).toHaveBeenCalledTimes(2);
      expect(sourcesApi.patchSource).toHaveBeenNthCalledWith(1, 1, { active: false });
      expect(sourcesApi.patchSource).toHaveBeenNthCalledWith(2, 2, { active: false });
    });

    it('reloads and throws when toggleGroupActive encounters an error', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
      vi.mocked(sourcesApi.patchSource).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.toggleGroupActive(10);
        }),
      ).rejects.toThrow('Network error');

      // Verifies that fetchSources was called again on error recovery
      expect(sourcesApi.fetchSources).toHaveBeenCalledTimes(2);
    });

    it('removes a source successfully', async () => {
      vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);
      vi.mocked(sourcesApi.deleteSource).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSources());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeSourceItem(1);
      });

      expect(sourcesApi.deleteSource).toHaveBeenCalledWith(1);
      expect(result.current.sources).toHaveLength(2);
    });
  });
});
