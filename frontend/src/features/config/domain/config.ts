export interface RuntimeConfig {
  capturePeriodicityMinutes: number;
  newsExpirationDays: number;
  humorMinimumNewsAggregation?: number;
}

export interface ConfigFormErrors {
  capturePeriodicityMinutes?: string;
  newsExpirationDays?: string;
}

export function validateConfig(config: Partial<RuntimeConfig>): ConfigFormErrors {
  const errors: ConfigFormErrors = {};

  if (config.capturePeriodicityMinutes === undefined || Number.isNaN(config.capturePeriodicityMinutes)) {
    errors.capturePeriodicityMinutes = 'La periodicidad es obligatoria';
  } else if (!Number.isInteger(config.capturePeriodicityMinutes) || config.capturePeriodicityMinutes < 1) {
    errors.capturePeriodicityMinutes = 'Debe ser un entero mayor o igual a 1';
  }

  if (config.newsExpirationDays === undefined || Number.isNaN(config.newsExpirationDays)) {
    errors.newsExpirationDays = 'La caducidad es obligatoria';
  } else if (!Number.isInteger(config.newsExpirationDays) || config.newsExpirationDays < 1) {
    errors.newsExpirationDays = 'Debe ser un entero mayor o igual a 1';
  }

  return errors;
}

export function isConfigValid(config: Partial<RuntimeConfig>): boolean {
  const errors = validateConfig(config);
  return Object.keys(errors).length === 0;
}
