import { http } from '../../../shared/api/httpClient';
import type { DashboardAggregate, DashboardData, InfluentialTerm, InfluentialTermsData } from '../domain/dashboard';
import type { Continent } from '../../sources/domain/source';

interface DashboardAggregateDto {
  continente: string;
  pais: string | null;
  humor: string | null;
  noticias: number;
  suficiente: boolean;
}

interface DashboardResponseDto {
  fecha_desde: string;
  fecha_hasta: string;
  continente: string | null;
  pais: string | null;
  agregados: DashboardAggregateDto[];
}

interface InfluentialTermDto {
  id_termino: number;
  termino: string;
  idioma: string;
  peso: string;
  aporte_total: string;
  frecuencia: number;
}

interface InfluentialTermsResponseDto {
  fecha_desde: string;
  fecha_hasta: string;
  continente: string | null;
  pais: string | null;
  terminos: InfluentialTermDto[];
}

function mapAggregate(dto: DashboardAggregateDto): DashboardAggregate {
  return {
    continente: dto.continente as Continent,
    pais: dto.pais,
    humor: dto.humor !== null ? parseFloat(dto.humor) : null,
    noticias: dto.noticias,
    suficiente: dto.suficiente,
  };
}

function mapDashboard(dto: DashboardResponseDto): DashboardData {
  return {
    fecha_desde: dto.fecha_desde,
    fecha_hasta: dto.fecha_hasta,
    continente: dto.continente as Continent | null,
    pais: dto.pais,
    agregados: dto.agregados.map(mapAggregate),
  };
}

function mapTerm(dto: InfluentialTermDto): InfluentialTerm {
  return {
    id_termino: dto.id_termino,
    termino: dto.termino,
    idioma: dto.idioma as 'es' | 'en',
    peso: parseFloat(dto.peso),
    aporte_total: parseFloat(dto.aporte_total),
    frecuencia: dto.frecuencia,
  };
}

function mapTerms(dto: InfluentialTermsResponseDto): InfluentialTermsData {
  return {
    fecha_desde: dto.fecha_desde,
    fecha_hasta: dto.fecha_hasta,
    continente: dto.continente as Continent | null,
    pais: dto.pais,
    terminos: dto.terminos.map(mapTerm),
  };
}

export interface FetchDashboardParams {
  fecha_desde: string;
  fecha_hasta: string;
  continente?: string | null;
  pais?: string | null;
}

export async function fetchDashboard(params: FetchDashboardParams): Promise<DashboardData> {
  const q = new URLSearchParams({ fecha_desde: params.fecha_desde, fecha_hasta: params.fecha_hasta });
  if (params.continente) q.set('continente', params.continente);
  if (params.pais) q.set('pais', params.pais);
  const dto = await http.get<DashboardResponseDto>(`/api/v1/dashboards?${q}`);
  return mapDashboard(dto);
}

export async function fetchInfluentialTerms(params: FetchDashboardParams): Promise<InfluentialTermsData> {
  const q = new URLSearchParams({ fecha_desde: params.fecha_desde, fecha_hasta: params.fecha_hasta });
  if (params.continente) q.set('continente', params.continente);
  if (params.pais) q.set('pais', params.pais);
  const dto = await http.get<InfluentialTermsResponseDto>(`/api/v1/dashboards/nube-palabras?${q}`);
  return mapTerms(dto);
}
