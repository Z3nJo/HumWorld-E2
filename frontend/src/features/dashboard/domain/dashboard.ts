import type { Continent } from '../../sources/domain/source';

export type { Continent };

export interface DashboardAggregate {
  continente: Continent;
  pais: string | null;
  humor: number | null;
  noticias: number;
  suficiente: boolean;
}

export interface DashboardData {
  fecha_desde: string;
  fecha_hasta: string;
  continente: Continent | null;
  pais: string | null;
  agregados: DashboardAggregate[];
}

export interface InfluentialTerm {
  id_termino: number;
  termino: string;
  idioma: 'es' | 'en';
  peso: number;
  aporte_total: number;
  frecuencia: number;
}

export interface InfluentialTermsData {
  fecha_desde: string;
  fecha_hasta: string;
  continente: Continent | null;
  pais: string | null;
  terminos: InfluentialTerm[];
}

export type CloudMode = 'nube' | 'tabla';

export interface DashboardDay {
  fecha: string;
  humor: number | null;
  noticias: number;
  suficiente: boolean;
}

export interface DashboardEvolutionData {
  fecha_desde: string;
  fecha_hasta: string;
  dias: DashboardDay[];
}

export interface InfluentialNews {
  id_noticia: number;
  titulo: string;
  url: string;
  canal: string;
  continente: Continent;
  pais: string | null;
  fecha_registro: string;
  valor_humor: number;
}

export interface InfluentialNewsData {
  noticias: InfluentialNews[];
}

export interface DashboardScope {
  continente: Continent | null;
  pais: string | null;
}
