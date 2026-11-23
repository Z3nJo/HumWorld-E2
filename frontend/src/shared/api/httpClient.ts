export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

type TokenGetter = () => Promise<string | null>;
type AuthFailureHandler = () => void | Promise<void>;

export interface HttpAuthConfiguration {
  getToken: TokenGetter;
  onUnauthorized: AuthFailureHandler;
  onForbidden: AuthFailureHandler;
}

let authConfiguration: HttpAuthConfiguration | null = null;

async function notifyAuthFailure(handler: AuthFailureHandler): Promise<void> {
  try {
    await handler();
  } catch {
    // The original HTTP/authentication error remains the source of truth.
  }
}

export function configureHttpAuth(
  configuration: HttpAuthConfiguration,
): () => void {
  authConfiguration = configuration;
  return () => {
    if (authConfiguration === configuration) {
      authConfiguration = null;
    }
  };
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

async function readErrorDetails(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return await response.text().catch(() => undefined);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const requestAuthConfiguration = authConfiguration;
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requestAuthConfiguration !== null && !headers.has('Authorization')) {
    let token: string | null;
    try {
      token = await requestAuthConfiguration.getToken();
    } catch {
      await notifyAuthFailure(requestAuthConfiguration.onUnauthorized);
      throw new HttpError('No fue posible obtener una sesión válida', 401);
    }
    if (!token) {
      await notifyAuthFailure(requestAuthConfiguration.onUnauthorized);
      throw new HttpError('No fue posible obtener una sesión válida', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const requestHadBearer = /^Bearer\s+\S+/i.test(headers.get('Authorization') ?? '');

  const response = await fetch(resolveUrl(path), { ...init, headers });
  if (!response.ok) {
    const details = await readErrorDetails(response);
    let message = `Error del servidor (${response.status})`;
    if (typeof details === 'object' && details !== null && 'detail' in details) {
      const detail = (details as { detail: unknown }).detail;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null && 'msg' in item) {
              return String((item as { msg: unknown }).msg);
            }
            return String(item);
          })
          .join(', ');
      } else if (detail !== undefined && detail !== null) {
        message = String(detail);
      }
    }
    if (response.status === 401 && requestHadBearer && requestAuthConfiguration !== null) {
      await notifyAuthFailure(requestAuthConfiguration.onUnauthorized);
    }
    if (response.status === 403 && requestHadBearer && requestAuthConfiguration !== null) {
      await notifyAuthFailure(requestAuthConfiguration.onForbidden);
    }
    throw new HttpError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
