import { http } from '../../../shared/api/httpClient';
import type { CreateTermInput, PatchTermInput, Term } from '../domain/dictionary';

interface TermDto {
  id_termino: number;
  palabra: string;
  idioma: 'es' | 'en';
  valor: string | number;
  activo: boolean;
  fecha_alta: string;
  fecha_modificacion: string;
}

function mapTerm(dto: TermDto): Term {
  return {
    id: dto.id_termino,
    word: dto.palabra,
    lang: dto.idioma,
    value: Number(dto.valor),
    active: dto.activo,
    created_at: dto.fecha_alta,
    updated_at: dto.fecha_modificacion,
  };
}

export async function fetchTerms(query?: string): Promise<Term[]> {
  const path = new URLSearchParams();
  if (query?.trim()) path.set('q', query.trim());
  const suffix = path.toString() ? `?${path.toString()}` : '';
  const rows = await http.get<TermDto[]>(`/api/v1/dictionary${suffix}`);
  return rows.map(mapTerm);
}

export async function createTerm(input: CreateTermInput): Promise<Term> {
  const dto = await http.post<TermDto>('/api/v1/dictionary', {
    palabra: input.word.trim(), idioma: input.lang, valor: input.value, activo: input.active ?? true,
  });
  return mapTerm(dto);
}

export async function patchTerm(id: number, input: PatchTermInput): Promise<Term> {
  const body: Record<string, unknown> = {};
  if (input.word !== undefined) body.palabra = input.word.trim();
  if (input.lang !== undefined) body.idioma = input.lang;
  if (input.value !== undefined) body.valor = input.value;
  if (input.active !== undefined) body.activo = input.active;
  return mapTerm(await http.patch<TermDto>(`/api/v1/dictionary/${id}`, body));
}

export async function deleteTerm(id: number): Promise<void> {
  await http.delete(`/api/v1/dictionary/${id}`);
}
