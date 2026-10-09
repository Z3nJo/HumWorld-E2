import { http } from '../../../shared/api/httpClient';
import type {
  ChannelSummary,
  Continent,
  CreateSourceBatchInput,
  IptcCategory,
  Language,
  PatchSourceInput,
  ReplaceSourceInput,
  Source,
} from '../domain/source';
import type {
  ChannelSummaryDto,
  SourceBatchCreateDto,
  SourceBatchResponseDto,
  SourcePatchDto,
  SourceReplaceDto,
  SourceResponseDto,
} from './sourcesDto';

export function mapChannelSummaryFromDto(dto: ChannelSummaryDto): ChannelSummary {
  return {
    id: dto.id_canal,
    name: dto.nombre,
    continent: dto.continente as Continent,
  };
}

export function mapSourceFromDto(dto: SourceResponseDto): Source {
  return {
    id: dto.id_fuente,
    channelId: dto.id_canal,
    name: dto.nombre,
    feedUrl: dto.url_feed,
    iptcCategory: dto.categoria_iptc as IptcCategory,
    language: dto.idioma as Language,
    active: dto.activa,
    channel: mapChannelSummaryFromDto(dto.canal),
  };
}

export function mapBatchCreateToDto(input: CreateSourceBatchInput): SourceBatchCreateDto {
  return {
    channel: input.channel
      ? {
          nombre: input.channel.name.trim(),
          continente: input.channel.continent,
        }
      : undefined,
    channel_id: input.channelId,
    sources: input.sources.map((s) => ({
      nombre: s.name.trim(),
      url_feed: s.feedUrl.trim(),
      categoria_iptc: s.iptcCategory,
      idioma: s.language,
      activa: s.active ?? true,
    })),
  };
}

export function mapReplaceToDto(input: ReplaceSourceInput): SourceReplaceDto {
  return {
    nombre: input.name.trim(),
    url_feed: input.feedUrl.trim(),
    categoria_iptc: input.iptcCategory,
    idioma: input.language,
    activa: input.active,
  };
}

export function mapPatchToDto(input: PatchSourceInput): SourcePatchDto {
  const dto: SourcePatchDto = {};
  if (input.name !== undefined) dto.nombre = input.name.trim();
  if (input.feedUrl !== undefined) dto.url_feed = input.feedUrl.trim();
  if (input.iptcCategory !== undefined) dto.categoria_iptc = input.iptcCategory;
  if (input.language !== undefined) dto.idioma = input.language;
  if (input.active !== undefined) dto.activa = input.active;
  return dto;
}

export async function fetchSources(
  continent?: Continent,
  active?: boolean,
): Promise<Source[]> {
  const params = new URLSearchParams();
  if (continent) params.set('continent', continent);
  if (active !== undefined) params.set('active', String(active));
  const query = params.toString() ? `?${params.toString()}` : '';

  const rows = await http.get<SourceResponseDto[]>(`/api/v1/sources${query}`);
  return rows.map(mapSourceFromDto);
}

export async function createSources(
  input: CreateSourceBatchInput,
): Promise<{ channel: ChannelSummary; sources: Source[] }> {
  const payload = mapBatchCreateToDto(input);
  const dto = await http.post<SourceBatchResponseDto>('/api/v1/sources', payload);
  return {
    channel: mapChannelSummaryFromDto(dto.channel),
    sources: dto.sources.map(mapSourceFromDto),
  };
}

export async function replaceSource(
  id: number,
  input: ReplaceSourceInput,
): Promise<Source> {
  const payload = mapReplaceToDto(input);
  const dto = await http.put<SourceResponseDto>(`/api/v1/sources/${id}`, payload);
  return mapSourceFromDto(dto);
}

export async function patchSource(
  id: number,
  input: PatchSourceInput,
): Promise<Source> {
  const payload = mapPatchToDto(input);
  const dto = await http.patch<SourceResponseDto>(`/api/v1/sources/${id}`, payload);
  return mapSourceFromDto(dto);
}

export async function deleteSource(id: number): Promise<void> {
  await http.delete(`/api/v1/sources/${id}`);
}
