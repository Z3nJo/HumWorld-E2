export interface ConfigResponseDto {
  captura_periodicidad_minutos: number;
  noticias_caducidad_dias: number;
  humor?: {
    minimo_noticias_agregacion?: number;
  };
  humor_minimo_noticias_agregacion?: number;
}

export interface ConfigReplaceDto {
  captura_periodicidad_minutos: number;
  noticias_caducidad_dias: number;
}
