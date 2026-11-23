import { describe, expect, it, vi } from 'vitest';
import { configureHttpAuth, http } from './httpClient';

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

  it('joins msg fields when detail is an array of validation errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            { loc: ['body', 'nombre'], msg: 'El nombre es obligatorio', type: 'value_error' },
            { loc: ['body', 'continente'], msg: 'Continente no válido', type: 'value_error' },
          ],
        }),
        { status: 400 },
      ),
    );

    await expect(http.post('/api/v1/channels', {})).rejects.toMatchObject({
      name: 'HttpError',
      status: 400,
      message: 'El nombre es obligatorio, Continente no válido',
    });
    fetchMock.mockRestore();
  });

  it('returns undefined for a 204 response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(http.delete('/api/v1/dictionary/1')).resolves.toBeUndefined();
    fetchMock.mockRestore();
  });

  it('adds the active Clerk token from the shared auth boundary', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const dispose = configureHttpAuth({
      getToken: vi.fn().mockResolvedValue('session-token'),
      onUnauthorized: vi.fn(),
      onForbidden: vi.fn(),
    });

    await http.get('/api/v1/config');

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer session-token');
    dispose();
    fetchMock.mockRestore();
  });

  it('keeps anonymous requests free of authorization after the boundary unmounts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const dispose = configureHttpAuth({
      getToken: vi.fn().mockResolvedValue('session-token'),
      onUnauthorized: vi.fn(),
      onForbidden: vi.fn(),
    });
    dispose();

    await http.get('/api/v1/dashboards');

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Headers).has('Authorization')).toBe(false);
    fetchMock.mockRestore();
  });

  it('does not route an anonymous in-flight 401 to a newly mounted auth boundary', async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const pendingRequest = http.get('/api/v1/private');
    const handlers = {
      getToken: vi.fn().mockResolvedValue('session-token'),
      onUnauthorized: vi.fn(),
      onForbidden: vi.fn(),
    };
    const dispose = configureHttpAuth(handlers);

    resolveResponse(new Response(JSON.stringify({ detail: 'Sin token' }), { status: 401 }));
    await expect(pendingRequest).rejects.toMatchObject({ status: 401 });

    expect(handlers.onUnauthorized).not.toHaveBeenCalled();
    dispose();
    fetchMock.mockRestore();
  });

  it('ends the active session without sending a request when Clerk returns no token', async () => {
    const handlers = {
      getToken: vi.fn().mockResolvedValue(null),
      onUnauthorized: vi.fn(),
      onForbidden: vi.fn(),
    };
    const dispose = configureHttpAuth(handlers);
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(http.get('/api/v1/private')).rejects.toMatchObject({ status: 401 });

    expect(handlers.onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    dispose();
    fetchMock.mockRestore();
  });

  it.each([
    [401, 'onUnauthorized'],
    [403, 'onForbidden'],
  ] as const)('routes status %s to the matching auth handler', async (status, handler) => {
    const handlers = {
      getToken: vi.fn().mockResolvedValue('session-token'),
      onUnauthorized: vi.fn(),
      onForbidden: vi.fn(),
    };
    const dispose = configureHttpAuth(handlers);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Auth error' }), { status }),
    );

    await expect(http.get('/api/v1/private')).rejects.toMatchObject({ status });

    expect(handlers[handler]).toHaveBeenCalledOnce();
    dispose();
    fetchMock.mockRestore();
  });
});
