import { http } from '../../../shared/api/httpClient';
import type { RuntimeConfig } from '../domain/config';
import type { ConfigReplaceDto, ConfigResponseDto } from './configDto';

export function mapConfigFromDto(dto: ConfigResponseDto): RuntimeConfig {
  return {
    capturePeriodicityMinutes: dto.captura_periodicidad_minutos,
    newsExpirationDays: dto.noticias_caducidad_dias,
    humorMinimumNewsAggregation:
      dto.humor_minimo_noticias_agregacion ?? dto.humor?.minimo_noticias_agregacion,
  };
}

export function mapConfigToDto(config: RuntimeConfig): ConfigReplaceDto {
  return {
    captura_periodicidad_minutos: config.capturePeriodicityMinutes,
    noticias_caducidad_dias: config.newsExpirationDays,
  };
}

export async function fetchConfig(): Promise<RuntimeConfig> {
  const dto = await http.get<ConfigResponseDto>('/api/v1/config');
  return mapConfigFromDto(dto);
}

export async function updateConfig(config: RuntimeConfig): Promise<RuntimeConfig> {
  const payload = mapConfigToDto(config);
  const dto = await http.put<ConfigResponseDto>('/api/v1/config', payload);
  return mapConfigFromDto(dto);
}
