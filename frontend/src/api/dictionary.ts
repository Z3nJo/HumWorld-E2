import type { CreateTermDto, PatchTermDto, Term } from '../types/dictionary';

interface RawBackendTerm {
  id_termino: number;
  palabra: string;
  idioma: 'es' | 'en';
  valor: string | number;
  activo: boolean;
  fecha_alta: string;
  fecha_modificacion: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const DICTIONARY_ENDPOINT = `${API_BASE_URL}/api/v1/dictionary`;

function mapBackendTermToFrontend(raw: RawBackendTerm): Term {
  return {
    id: raw.id_termino,
    word: raw.palabra,
    lang: raw.idioma,
    value: Number(raw.valor),
    active: raw.activo,
    created_at: raw.fecha_alta,
    updated_at: raw.fecha_modificacion,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Error del servidor (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
      } else if (data.message) {
        errorMessage = data.message;
      }
    } catch {
      const text = await res.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

export async function fetchTerms(q?: string): Promise<Term[]> {
  const url = new URL(DICTIONARY_ENDPOINT, window.location.origin);
  if (q && q.trim()) {
    url.searchParams.set('q', q.trim());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const rawList = await handleResponse<RawBackendTerm[]>(res);
  return rawList.map(mapBackendTermToFrontend);
}

export async function createTerm(data: CreateTermDto): Promise<Term> {
  const payload = {
    palabra: data.word.trim(),
    idioma: data.lang,
    valor: data.value,
    activo: data.active ?? true,
  };

  const res = await fetch(DICTIONARY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await handleResponse<RawBackendTerm>(res);
  return mapBackendTermToFrontend(raw);
}

export async function patchTerm(id: number, data: PatchTermDto): Promise<Term> {
  const payload: Record<string, unknown> = {};
  if (data.word !== undefined) payload.palabra = data.word.trim();
  if (data.lang !== undefined) payload.idioma = data.lang;
  if (data.value !== undefined) payload.valor = data.value;
  if (data.active !== undefined) payload.activo = data.active;

  const res = await fetch(`${DICTIONARY_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await handleResponse<RawBackendTerm>(res);
  return mapBackendTermToFrontend(raw);
}

export async function deleteTerm(id: number): Promise<void> {
  const res = await fetch(`${DICTIONARY_ENDPOINT}/${id}`, {
    method: 'DELETE',
  });

  await handleResponse<void>(res);
}
