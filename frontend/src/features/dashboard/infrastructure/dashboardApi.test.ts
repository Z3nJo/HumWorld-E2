import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../../shared/api/httpClient';
import { fetchEvolution, fetchGeography, fetchInfluentialNews } from './dashboardApi';

vi.mock('../../../shared/api/httpClient', () => ({ http: { get: vi.fn() } }));

const params = { fecha_desde: '2026-10-01', fecha_hasta: '2026-10-07', continente: 'America', pais: 'CL' };

describe('dashboard daily evolution and ranking API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the geographic context with only period filters and maps country scores', async () => {
    vi.mocked(http.get).mockResolvedValue({
      ...params, agregados: [{ continente: 'America', pais: 'CL', humor: '-0.500', noticias: 4, suficiente: true }],
    });
    const result = await fetchGeography(params);
    expect(result.agregados[0].humor).toBe(-0.5);
    expect(http.get).toHaveBeenCalledWith('/api/v1/dashboards/geografia?fecha_desde=2026-10-01&fecha_hasta=2026-10-07');
  });

  it('maps decimal scores and preserves empty daily values', async () => {
    vi.mocked(http.get).mockResolvedValue({
      fecha_desde: params.fecha_desde, fecha_hasta: params.fecha_hasta,
      dias: [
        { fecha: '2026-10-01', humor: '-0.300', noticias: 2, suficiente: true },
        { fecha: '2026-10-02', humor: null, noticias: 0, suficiente: false },
      ],
    });
    const data = await fetchEvolution(params);
    expect(data.dias[0].humor).toBe(-0.3);
    expect(data.dias[1].humor).toBeNull();
    expect(http.get).toHaveBeenCalledWith('/api/v1/dashboards/evolucion?fecha_desde=2026-10-01&fecha_hasta=2026-10-07&continente=America&pais=CL');
  });

  it('maps ranked news without changing the server order', async () => {
    vi.mocked(http.get).mockResolvedValue({ noticias: [
      { id_noticia: 2, titulo: 'Negativa', valor_humor: '-0.900' },
      { id_noticia: 1, titulo: 'Positiva', valor_humor: '0.300' },
    ] });
    const data = await fetchInfluentialNews(params);
    expect(data.noticias.map((item) => [item.id_noticia, item.valor_humor])).toEqual([[2, -0.9], [1, 0.3]]);
    expect(http.get).toHaveBeenCalledWith('/api/v1/dashboards/noticias-influyentes?fecha_desde=2026-10-01&fecha_hasta=2026-10-07&continente=America&pais=CL');
  });
});
