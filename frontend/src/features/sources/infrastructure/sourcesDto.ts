export interface ChannelSummaryDto {
  id_canal: number;
  nombre: string;
  continente: string;
}

export interface SourceResponseDto {
  id_fuente: number;
  id_canal: number;
  nombre: string;
  url_feed: string;
  categoria_iptc: string;
  idioma: string;
  activa: boolean;
  canal: ChannelSummaryDto;
}

export interface SourceBatchCreateDto {
  channel?: {
    nombre: string;
    continente: string;
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
