import type { ConfigFormErrors } from '../domain/config';

interface ConfigCardsProps {
  captureMinutes: number;
  expirationDays: number;
  humorMinimumNewsAggregation?: number;
  onChangeCaptureMinutes: (value: number) => void;
  onChangeExpirationDays: (value: number) => void;
  errors: ConfigFormErrors;
  disabled?: boolean;
}

export const ConfigCards = ({
  captureMinutes,
  expirationDays,
  humorMinimumNewsAggregation,
  onChangeCaptureMinutes,
  onChangeExpirationDays,
  errors,
  disabled = false,
}: ConfigCardsProps) => (
  <div className="opgrid">
    <div className="card">
      <div className="ch">
        <h2>Captura y caducidad</h2>
        <small>captura_periodicidad_minutos · noticias_caducidad_dias</small>
      </div>
      <div className="cb config-fields">
        <label className="f" style={{ maxWidth: '380px' }}>
          Periodicidad de captura
          <span className="row" style={{ gap: '8px', flexWrap: 'nowrap' }}>
            <input
              className={`inp mono ${errors.capturePeriodicityMinutes ? 'err' : ''}`}
              style={{ width: '120px' }}
              type="number"
              min="1"
              step="1"
              value={Number.isNaN(captureMinutes) ? '' : captureMinutes}
              onChange={(event) => onChangeCaptureMinutes(parseInt(event.target.value, 10))}
              disabled={disabled}
              aria-label="Periodicidad de captura en minutos"
            />
            <span className="help">minutos</span>
          </span>
          {errors.capturePeriodicityMinutes ? (
            <span className="errtxt">{errors.capturePeriodicityMinutes}</span>
          ) : (
            <span className="help">El planificador consulta los canales activos con esta frecuencia.</span>
          )}
        </label>

        <label className="f" style={{ maxWidth: '380px' }}>
          Caducidad de noticias
          <span className="row" style={{ gap: '8px', flexWrap: 'nowrap' }}>
            <input
              className={`inp mono ${errors.newsExpirationDays ? 'err' : ''}`}
              style={{ width: '120px' }}
              type="number"
              min="1"
              step="1"
              value={Number.isNaN(expirationDays) ? '' : expirationDays}
              onChange={(event) => onChangeExpirationDays(parseInt(event.target.value, 10))}
              disabled={disabled}
              aria-label="Caducidad de noticias en días"
            />
            <span className="help">días</span>
          </span>
          {errors.newsExpirationDays ? (
            <span className="errtxt">{errors.newsExpirationDays}</span>
          ) : (
            <span className="help">
              Las noticias más antiguas se purgan automáticamente y dejan de mostrarse en el dashboard.
            </span>
          )}
        </label>
      </div>
    </div>

    <div className="card">
      <div className="ch">
        <h2>
          Agregación del humor <span className="prop">PROPUESTA</span>
        </h2>
        <small>humor.minimo_noticias_agregacion</small>
      </div>
      <div className="cb config-fields">
        <label className="f" style={{ maxWidth: '380px' }}>
          Mínimo de noticias por región
          <span className="row" style={{ gap: '8px', flexWrap: 'nowrap' }}>
            <input
              className="inp mono"
              style={{ width: '120px' }}
              type="number"
              value={humorMinimumNewsAggregation ?? 3}
              disabled
              aria-label="Mínimo de noticias por región"
            />
            <span className="help">noticias</span>
          </span>
          <span className="help">
            Requiere soporte del backend para editarse y guardarse. Por debajo de este número el humor regional se marca como provisional.
          </span>
        </label>
      </div>
    </div>
  </div>
);
