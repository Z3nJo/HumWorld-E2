import { describe, expect, it, vi } from 'vitest';
import { http } from './httpClient';

describe('httpClient', () => {
  it('returns JSON and applies the shared Accept header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await expect(http.get<{ ok: boolean }>('/api/v1/health')).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Headers).get('Accept')).toBe('application/json');
    fetchMock.mockRestore();
  });

  it('throws an error with status and API details', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'No autorizado' }), { status: 401 }),
    );

    await expect(http.get('/api/v1/private')).rejects.toMatchObject({
      name: 'HttpError', status: 401, message: 'No autorizado',
    });
    fetchMock.mockRestore();
  });

  it('returns undefined for a 204 response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(http.delete('/api/v1/dictionary/1')).resolves.toBeUndefined();
    fetchMock.mockRestore();
  });
});
