import { describe, expect, it, vi } from 'vitest';
import { http } from '../../../shared/api/httpClient';
import {
  createSources,
  deleteSource,
  fetchSources,
  mapBatchCreateToDto,
  mapSourceFromDto,
  patchSource,
  replaceSource,
} from './sourcesApi';
import type { SourceResponseDto } from './sourcesDto';

vi.mock('../../../shared/api/httpClient', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('sourcesApi', () => {
  const sampleDto: SourceResponseDto = {
    id_fuente: 10,
    id_canal: 1,
    nombre: 'Portada',
    url_feed: 'https://elpais.com/rss/portada.xml',
    categoria_iptc: 'politics',
    idioma: 'es',
    activa: true,
    canal: {
      id_canal: 1,
      nombre: 'El País',
      continente: 'Europa',
    },
  };

  it('maps dto to domain source properly', () => {
    const domain = mapSourceFromDto(sampleDto);
    expect(domain.id).toBe(10);
    expect(domain.name).toBe('Portada');
    expect(domain.feedUrl).toBe('https://elpais.com/rss/portada.xml');
    expect(domain.channel.name).toBe('El País');
    expect(domain.channel.continent).toBe('Europa');
  });

  it('maps batch create input to dto', () => {
    const dto = mapBatchCreateToDto({
      channel: { name: '  Clarín  ', continent: 'America' },
      sources: [
        {
          name: '  Noticias  ',
          feedUrl: '  https://clarin.com/rss.xml  ',
          iptcCategory: 'politics',
          language: 'es',
        },
      ],
    });
    expect(dto.channel?.nombre).toBe('Clarín');
    expect(dto.sources[0].nombre).toBe('Noticias');
    expect(dto.sources[0].url_feed).toBe('https://clarin.com/rss.xml');
    expect(dto.sources[0].activa).toBe(true);
  });

  it('calls http.get on fetchSources with continent and active query params', async () => {
    vi.mocked(http.get).mockResolvedValueOnce([sampleDto]);
    const sources = await fetchSources('Europa', true);

    expect(http.get).toHaveBeenCalledWith('/api/v1/sources?continent=Europa&active=true');
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('Portada');
  });

  it('calls http.post on createSources', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      channel: sampleDto.canal,
      sources: [sampleDto],
    });

    const res = await createSources({
      channel: { name: 'El País', continent: 'Europa' },
      sources: [
        {
          name: 'Portada',
          feedUrl: 'https://elpais.com/rss/portada.xml',
          iptcCategory: 'politics',
          language: 'es',
        },
      ],
    });

    expect(http.post).toHaveBeenCalled();
    expect(res.channel.name).toBe('El País');
    expect(res.sources[0].name).toBe('Portada');
  });

  it('calls http.put on replaceSource', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(sampleDto);

    const res = await replaceSource(10, {
      name: 'Portada',
      feedUrl: 'https://elpais.com/rss/portada.xml',
      iptcCategory: 'politics',
      language: 'es',
      active: true,
    });

    expect(http.put).toHaveBeenCalledWith('/api/v1/sources/10', expect.any(Object));
    expect(res.id).toBe(10);
  });

  it('calls http.patch on patchSource', async () => {
    vi.mocked(http.patch).mockResolvedValueOnce({ ...sampleDto, activa: false });

    const res = await patchSource(10, { active: false });

    expect(http.patch).toHaveBeenCalledWith('/api/v1/sources/10', { activa: false });
    expect(res.active).toBe(false);
  });

  it('calls http.delete on deleteSource', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce(undefined);

    await deleteSource(10);

    expect(http.delete).toHaveBeenCalledWith('/api/v1/sources/10');
  });
});
