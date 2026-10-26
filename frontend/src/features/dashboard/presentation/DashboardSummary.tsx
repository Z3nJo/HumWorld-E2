import React from 'react';
import * as d3 from 'd3';
import type { DashboardAggregate } from '../domain/dashboard';
import type { Continent } from '../../sources/domain/source';
import {
  COUNTRIES_DATA,
  CONTINENT_ORDER,
  formatHumor,
  formatNumber,
} from '../domain/countries';

const colorScale = d3
  .scaleLinear<string>()
  .domain([-1, -0.5, 0, 0.5, 1])
  .range(['#bf4f22', '#e2a383', '#e6e0d2', '#9cc4a8', '#357050'])
  .interpolate(d3.interpolateLab)
  .clamp(true);

interface DashboardSummaryProps {
  scopeName: string;
  windowSize: number;
  dateLabel: string;
  scopeAggregate: DashboardAggregate | null;
  aggregates: DashboardAggregate[];
  continent: Continent | null;
  pais: string | null;
  minAggregationCount?: number;
  onSelectContinent: (c: Continent | null) => void;
  onSelectCountry: (p: string | null) => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  scopeName,
  windowSize,
  dateLabel,
  scopeAggregate,
  aggregates,
  continent,
  pais,
  minAggregationCount = 3,
  onSelectContinent,
  onSelectCountry,
}) => {
  const humor = scopeAggregate?.humor ?? null;
  const noticias = scopeAggregate?.noticias ?? 0;
  const suficiente = scopeAggregate?.suficiente ?? false;

  const state = noticias === 0 ? 'nd' : suficiente ? 'ok' : 'prov';
  const continentTotal = aggregates.find((a) => a.continente === continent && !a.pais)?.noticias ?? 0;
  const assignedTotal = aggregates.filter((a) => a.continente === continent && a.pais)
    .reduce((total, a) => total + a.noticias, 0);
  const unassignedCount = Math.max(0, continentTotal - assignedTotal);

  // Sub-items for table
  const subItems = continent
    ? COUNTRIES_DATA.filter((c) => c.cont === continent).map((c) => {
        const found = aggregates.find((a) => a.pais === c.iso);
        return {
          key: c.iso,
          label: c.es,
          humor: found?.humor ?? null,
          noticias: found?.noticias ?? 0,
          suficiente: found?.suficiente ?? false,
          isSelected: pais === c.iso,
          type: 'pais' as const,
        };
      })
    : CONTINENT_ORDER.map((c) => {
        const found = aggregates.find((a) => a.continente === c.key && !a.pais);
        return {
          key: c.key,
          label: c.label,
          humor: found?.humor ?? null,
          noticias: found?.noticias ?? 0,
          suficiente: found?.suficiente ?? false,
          isSelected: continent === c.key,
          type: 'cont' as const,
        };
      });

  const humorColor =
    humor !== null && humor < 0
      ? 'var(--neg)'
      : humor !== null && humor > 0
      ? 'var(--pos)'
      : 'var(--ink)';

  return (
    <div
      className="card"
      id="sum"
      data-ann="GET /dashboards · ADR-001 §4.3.3"
    >
      <div className="ch">
        <h2>{scopeName}</h2>
        <small>
          {windowSize > 1 ? '7 días' : 'día'} · {dateLabel}
        </small>
      </div>

      <div className="cb">
        {state === 'nd' ? (
          <>
            <div className="big nd">Sin datos</div>
            <p className="help" style={{ margin: '8px 0 0' }}>
              No hay noticias evaluables para este ámbito y fecha. No se muestra como neutro.
            </p>
          </>
        ) : (
          <>
            <div
              className="row"
              style={{ alignItems: 'flex-end', gap: '14px' }}
            >
              <div className="big" style={{ color: humorColor }}>
                {formatHumor(humor)}
              </div>
              <div style={{ paddingBottom: '8px' }}>
                {state === 'ok' ? (
                  <span className="pill ok">Suficiente</span>
                ) : (
                  <span className="pill prov">Provisional</span>
                )}
              </div>
            </div>

            <div className="scale" aria-hidden="true">
              <i className="scale-marker" style={{ left: `${((humor ?? 0) + 1) * 50}%` }} />
            </div>
            <div className="ramp" style={{ width: 'auto' }}>
              <div className="ramp-tk">
                <span>−1</span>
                <span>0</span>
                <span>+1</span>
              </div>
            </div>
          </>
        )}

        <dl className="kv">
          <dt>humor</dt>
          <dd>{humor == null ? 'null' : humor.toFixed(4)}</dd>
          <dt>noticias</dt>
          <dd>{formatNumber(noticias)} evaluables</dd>
          <dt>suficiente</dt>
          <dd>
            {String(suficiente)}
            {state === 'prov' ? ` · mínimo ${minAggregationCount}` : ''}
          </dd>
        </dl>

        <table
          className="t ctab"
          style={{ marginTop: '16px' }}
          aria-label={`Humor por ${continent ? 'país' : 'continente'}`}
        >
          <thead>
            <tr>
              <th>{continent ? 'País' : 'Continente'}</th>
              <th className="num">Humor</th>
              <th className="num">Not.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {subItems.length ? (
              subItems.map((item) => {
                const dotColor =
                  item.noticias > 0 && item.humor !== null
                    ? colorScale(item.humor)
                    : 'repeating-linear-gradient(135deg, #ece7dc 0 2px, #b9b09d 2px 3px)';

                return (
                  <tr
                    key={item.key}
                    className={item.isSelected ? 'on' : ''}
                    onClick={() => {
                      if (item.type === 'pais') {
                        onSelectCountry(item.isSelected ? null : item.key);
                      } else {
                        onSelectContinent(item.isSelected ? null : (item.key as Continent));
                        onSelectCountry(null);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                  >
                    <td>
                      <span className="row" style={{ gap: '8px' }}>
                        <i
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '2px',
                            display: 'inline-block',
                            background: dotColor,
                            border: '1px solid #0002',
                          }}
                        />
                        {item.label}
                      </span>
                    </td>
                    <td className="num">{formatHumor(item.humor)}</td>
                    <td className="num">{item.noticias}</td>
                    <td>
                      {item.noticias === 0 ? (
                        <span className="pill nd">sin datos</span>
                      ) : item.suficiente ? (
                        ''
                      ) : (
                        <span className="pill prov">prov.</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="help">
                  Sin países con fuentes registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {continent && unassignedCount > 0 && (
          <p className="help" role="status">
            {formatNumber(unassignedCount)} noticias de canales sin país asignado.
            Asigna el país en Fuentes y canales para incluirlas en el mapa y la tabla por país.
          </p>
        )}
      </div>
    </div>
  );
};
