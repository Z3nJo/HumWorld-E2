import type { CreateSourceBatchInput, ReplaceSourceInput } from './source';

export interface SourceValidationErrors {
  channelName?: string;
  channelContinent?: string;
  sources?: Array<{
    name?: string;
    feedUrl?: string;
    iptcCategory?: string;
  }>;
}

export function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCreateBatch(input: CreateSourceBatchInput): SourceValidationErrors {
  const errors: SourceValidationErrors = {};

  if (!input.channelId) {
    if (!input.channel?.name || !input.channel.name.trim()) {
      errors.channelName = 'El nombre del medio/canal es obligatorio';
    }
    if (!input.channel?.continent) {
      errors.channelContinent = 'El continente es obligatorio';
    }
  }

  if (!input.sources || input.sources.length === 0) {
    errors.channelName = errors.channelName || 'Debe agregar al menos un feed RSS';
  } else {
    const sourceErrors = input.sources.map((s) => {
      const err: { name?: string; feedUrl?: string; iptcCategory?: string } = {};
      if (!s.name || !s.name.trim()) {
        err.name = 'El nombre del feed es obligatorio';
      }
      if (!s.feedUrl || !s.feedUrl.trim()) {
        err.feedUrl = 'La URL del feed RSS es obligatoria';
      } else if (!isValidHttpUrl(s.feedUrl.trim())) {
        err.feedUrl = 'URL RSS no válida (debe comenzar con http:// o https://)';
      }
      if (!s.iptcCategory) {
        err.iptcCategory = 'La categoría IPTC es obligatoria';
      }
      return err;
    });

    if (sourceErrors.some((e) => Object.keys(e).length > 0)) {
      errors.sources = sourceErrors;
    }
  }

  return errors;
}

export function validateReplaceSource(input: ReplaceSourceInput): {
  name?: string;
  feedUrl?: string;
  iptcCategory?: string;
} {
  const err: { name?: string; feedUrl?: string; iptcCategory?: string } = {};
  if (!input.name || !input.name.trim()) {
    err.name = 'El nombre del feed es obligatorio';
  }
  if (!input.feedUrl || !input.feedUrl.trim()) {
    err.feedUrl = 'La URL del feed RSS es obligatoria';
  } else if (!isValidHttpUrl(input.feedUrl.trim())) {
    err.feedUrl = 'URL RSS no válida (debe comenzar con http:// o https://)';
  }
  if (!input.iptcCategory) {
    err.iptcCategory = 'La categoría IPTC es obligatoria';
  }
  return err;
}
