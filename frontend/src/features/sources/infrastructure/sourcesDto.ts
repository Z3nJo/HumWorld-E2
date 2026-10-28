export interface ChannelDto {
  id_canal: number;
  nombre: string;
  continente: string;
  pais?: string | null;
  url_sitio?: string | null;
  activo?: boolean;
  fecha_alta?: string;
}

export type ChannelSummaryDto = ChannelDto;

export interface ChannelPatchDto {
  nombre?: string;
  continente?: string;
  pais?: string | null;
  url_sitio?: string | null;
  activo?: boolean;
}

export interface SourceResponseDto {
  id_fuente: number;
  id_canal: number;
  nombre: string;
  url_feed: string;
  categoria_iptc: string;
  idioma: string;
  activa: boolean;
  fecha_ultima_captura?: string | null;
  fecha_alta?: string;
  canal?: ChannelSummaryDto;
}

export interface SourceBatchCreateDto {
  channel?: {
    nombre: string;
    continente: string;
    pais?: string | null;
    url_sitio?: string | null;
    activo?: boolean;
  };
  channel_id?: number;
  sources: Array<{
    nombre: string;
    url_feed: string;
    categoria_iptc: string;
    idioma: string;
    activa: boolean;
  }>;
}

export interface SourceBatchResponseDto {
  channel: ChannelSummaryDto;
  sources: SourceResponseDto[];
}

export interface SourceReplaceDto {
  nombre: string;
  url_feed: string;
  categoria_iptc: string;
  idioma: string;
  activa: boolean;
}

export interface SourcePatchDto {
  nombre?: string;
  url_feed?: string;
  categoria_iptc?: string;
  idioma?: string;
  activa?: boolean;
}

export interface CaptureRequestDto {
  source_ids: number[];
}

export interface CaptureResponseDto {
  sources: Array<{
    source_id: number;
    inserted: number;
    duplicates: number;
    invalid: number;
    error: string | null;
  }>;
  skipped_source_ids: number[];
  inserted: number;
  failed_sources: number;
}
