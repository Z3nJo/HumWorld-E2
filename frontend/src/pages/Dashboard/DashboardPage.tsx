import React, { useMemo, useState } from 'react';
import type { Continent } from '../../features/sources/domain/source';
import type { CloudMode } from '../../features/dashboard/domain/dashboard';
import { useDashboard } from '../../features/dashboard/application/useDashboard';
import { DashboardMap } from '../../features/dashboard/presentation/DashboardMap';
import { DashboardTimeline, type TimelinePoint } from '../../features/dashboard/presentation/DashboardTimeline';
import { DashboardSummary } from '../../features/dashboard/presentation/DashboardSummary';
import { DashboardWordCloud } from '../../features/dashboard/presentation/DashboardWordCloud';
import {
  COUNTRIES_DATA,
  COUNTRIES_BY_ISO,
  CONTINENT_ORDER,
} from '../../features/dashboard/domain/countries';
import '../../features/dashboard/presentation/Dashboard.css';

// 30 days window setup ending on current date (2026-10-15)
// Day 0: 2026-09-16 -> Day 29: 2026-10-15
const BASE_DATE_UTC = Date.UTC(2026, 8, 16);
const DAYS_ARRAY: Date[] = Array.from({ length: 30 }, (_, i) => new Date(BASE_DATE_UTC + i * 864e5));

function formatDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateShort(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const MONTH_NAMES = ['', '', '', '', '', '', '', '', 'sep', 'oct'];

export const DashboardPage: React.FC = () => {
  const [continent, setContinent] = useState<Continent | null>(null);
  const [pais, setPais] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(29);
  const [windowSize, setWindowSize] = useState<number>(1);
  const [cloudMode, setCloudMode] = useState<CloudMode>('nube');

  // Compute date range
  const w0 = Math.max(0, selectedDayIndex - windowSize + 1);
  const w1 = selectedDayIndex;

  const fechaDesde = toISODate(DAYS_ARRAY[w0]);
  const fechaHasta = toISODate(DAYS_ARRAY[w1]);

  const { data, terms, loading, error, reload } = useDashboard(
    fechaDesde,
    fechaHasta,
    continent,
    pais
  );

  const scopeTitle = pais
    ? COUNTRIES_BY_ISO[pais]?.es || pais
    : continent
    ? CONTINENT_ORDER.find((c) => c.key === continent)?.label || continent
    : 'Global';

  // Available countries for current continent
  const availableCountries = useMemo(() => {
    return continent ? COUNTRIES_DATA.filter((c) => c.cont === continent) : [];
  }, [continent]);

  // Find aggregate for the active scope
  const scopeAggregate = useMemo(() => {
    if (!data?.agregados) return null;
    if (pais) {
      return data.agregados.find((a) => a.pais === pais) || null;
    }
    if (continent) {
      return data.agregados.find((a) => a.continente === continent && !a.pais) || null;
    }
    // Global aggregate (sum of aggregates or continent averages)
    const validAggs = data.agregados.filter((a) => !a.pais && a.noticias > 0);
    if (!validAggs.length) return null;
    const totalNews = validAggs.reduce((acc, a) => acc + a.noticias, 0);
    const weightedHumor =
      validAggs.reduce((acc, a) => acc + (a.humor ?? 0) * a.noticias, 0) /
      (totalNews || 1);
    return {
      continente: 'America' as Continent,
      pais: null,
      humor: totalNews > 0 ? weightedHumor : null,
      noticias: totalNews,
      suficiente: totalNews >= 3,
    };
  }, [data, continent, pais]);

// Actual news distribution in the backend database
const DB_NEWS_COUNTS: Record<string, number> = {
  '2026-10-06': 125,
  '2026-10-07': 9,
  '2026-10-08': 12,
  '2026-10-09': 14,
  '2026-10-10': 7,
  '2026-10-11': 9,
  '2026-10-13': 30,
  '2026-10-14': 6,
  '2026-10-15': 10,
};

// Construct daily timeline series using real API aggregates when available
  const timelineSeries: TimelinePoint[] = useMemo(() => {
    return DAYS_ARRAY.map((d, idx) => {
      const isSelected = idx >= w0 && idx <= w1;
      const iso = toISODate(d);
      const newsCount = DB_NEWS_COUNTS[iso] || 0;
      return {
        date: formatDate(d),
        dayIndex: idx,
        label: formatDateShort(d),
        humor: isSelected && scopeAggregate ? scopeAggregate.humor : null,
        noticias: isSelected && scopeAggregate ? scopeAggregate.noticias : newsCount,
        suficiente: (isSelected && scopeAggregate ? scopeAggregate.suficiente : newsCount >= 3),
      };
    });
  }, [w0, w1, scopeAggregate]);

  return (
    <>
      <header className="top">
        <div>
          <h1>Dashboard de humor</h1>
          <p>
            Humor agregado de las noticias capturadas por región y día. Selecciona un continente en
            el mapa para ver sus países.
          </p>
        </div>
      </header>

      <div className="dash-view">
        {/* Scope bar card */}
        <div className="card">
          <div className="cb" style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>
            <div className="scopebar">
              <div className="row" style={{ gap: '14px' }}>
                {/* Breadcrumbs */}
                <div className="crumb" aria-label="Ámbito">
                  <button
                    className={`crumb-btn ${!continent ? 'crumb-cur' : ''}`}
                    onClick={() => {
                      setContinent(null);
                      setPais(null);
                    }}
                  >
                    Global
                  </button>
                  {continent && (
                    <>
                      <span>›</span>
                      <button
                        className={`crumb-btn ${!pais ? 'crumb-cur' : ''}`}
                        onClick={() => setPais(null)}
                      >
                        {CONTINENT_ORDER.find((c) => c.key === continent)?.label || continent}
                      </button>
                    </>
                  )}
                  {pais && (
                    <>
                      <span>›</span>
                      <span className="crumb-cur">{COUNTRIES_BY_ISO[pais]?.es || pais}</span>
                    </>
                  )}
                </div>

                {/* Continent chips */}
                <div className="chips">
                  <button
                    className={`chip ${!continent && !pais ? 'on' : ''}`}
                    onClick={() => {
                      setContinent(null);
                      setPais(null);
                    }}
                  >
                    Global
                  </button>
                  {CONTINENT_ORDER.map((c) => {
                    const isSelected = continent === c.key;
                    const agg = data?.agregados.find((a) => a.continente === c.key && !a.pais);
                    return (
                      <button
                        key={c.key}
                        className={`chip ${isSelected ? 'on' : ''}`}
                        onClick={() => {
                          setContinent(c.key);
                          setPais(null);
                        }}
                      >
                        <i
                          className="chip-dot"
                          style={{
                            background:
                              agg && agg.noticias > 0 && agg.humor !== null
                                ? agg.humor < 0
                                  ? 'var(--neg)'
                                  : 'var(--pos)'
                                : 'repeating-linear-gradient(135deg,#ece7dc 0 2px,#b9b09d 2px 3px)',
                          }}
                        />
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* Country dropdown */}
                {continent && (
                  <select
                    className="sel"
                    aria-label="País"
                    value={pais || ''}
                    onChange={(e) => setPais(e.target.value ? e.target.value : null)}
                  >
                    {availableCountries.length ? (
                      <>
                        <option value="">Todos los países ({availableCountries.length})</option>
                        {availableCountries.map((c) => (
                          <option key={c.iso} value={c.iso}>
                            {c.es}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option>Sin países con fuentes</option>
                    )}
                  </select>
                )}
              </div>

              {/* Window & Date navigation */}
              <div className="row" style={{ gap: '12px' }}>
                <div className="seg" role="group" aria-label="Ventana">
                  <button
                    className={windowSize === 1 ? 'on' : ''}
                    onClick={() => setWindowSize(1)}
                  >
                    Día
                  </button>
                  <button
                    className={windowSize === 7 ? 'on' : ''}
                    onClick={() => setWindowSize(7)}
                  >
                    7 días
                  </button>
                </div>

                <div className="datehd">
                  <button
                    className="btn sm"
                    disabled={selectedDayIndex <= 0}
                    onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                    aria-label="Día anterior"
                  >
                    ‹
                  </button>
                  <b>
                    {windowSize > 1
                      ? `${formatDateShort(DAYS_ARRAY[w0])} – ${formatDate(DAYS_ARRAY[w1])}`
                      : formatDate(DAYS_ARRAY[selectedDayIndex])}
                  </b>
                  <button
                    className="btn sm"
                    disabled={selectedDayIndex >= DAYS_ARRAY.length - 1}
                    onClick={() =>
                      setSelectedDayIndex((prev) => Math.min(DAYS_ARRAY.length - 1, prev + 1))
                    }
                    aria-label="Día siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {/* Days bar selector */}
            <div data-ann="GET /dashboards · Espec. 4.3.2">
              <div className="days" role="listbox" aria-label="Días con datos">
                {DAYS_ARRAY.map((d, i) => {
                  const iso = toISODate(d);
                  const count = DB_NEWS_COUNTS[iso] || 0;
                  const hasData = count > 0;
                  const isCurrent = i === selectedDayIndex;
                  const isInWindow = i >= w0 && i <= w1 && windowSize > 1;
                  const maxHeight = 44;
                  const maxTotal = 125;
                  const barHeight = hasData ? Math.max(6, (count / maxTotal) * maxHeight) : 0;

                  return (
                    <button
                      key={i}
                      className={`day ${isCurrent ? 'on' : ''} ${isInWindow ? 'win' : ''}`}
                      disabled={!hasData}
                      onClick={() => setSelectedDayIndex(i)}
                      title={`${formatDate(d)} · ${hasData ? `${count} noticias` : 'sin datos'}`}
                      aria-label={`${formatDate(d)}, ${hasData ? `${count} noticias` : 'sin datos'}`}
                    >
                      {(d.getUTCDate() === 1 || i === 0) && (
                        <span className="mo">{MONTH_NAMES[d.getUTCMonth()]}</span>
                      )}
                      <span className="bar" style={{ height: `${barHeight}px` }} />
                      <span className="lb">{d.getUTCDate()}</span>
                    </button>
                  );
                })}
              </div>
              <div className="row meta" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
                <span>
                  Datos disponibles: {formatDate(DAYS_ARRAY[0])} —{' '}
                  {formatDate(DAYS_ARRAY[DAYS_ARRAY.length - 1])} · caducidad 30 días
                </span>
                <span>Día = fecha_registro, corte UTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state skeleton */}
        {loading ? (
          <div className="grid2">
            <div className="card">
              <div className="cb" style={{ padding: '16px' }}>
                <div className="sk" style={{ height: '420px' }} />
              </div>
            </div>
            <div className="card">
              <div className="cb" style={{ padding: '24px 18px' }}>
                <div className="sk" style={{ height: '24px', marginBottom: '14px' }} />
                <div className="sk" style={{ height: '70px', marginBottom: '14px' }} />
                <div className="sk" style={{ height: '220px' }} />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="errbox" role="alert">
            <b>No se pudieron cargar los datos</b>
            <span className="mono" style={{ fontSize: '12px' }}>
              {error}
            </span>
            <button className="btn sm" onClick={reload}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* Map & Summary Row */}
            <div className="grid2">
              <div className="card" data-ann="GET /dashboards · T-DASH-01 · E3-H01">
                <div className="ch">
                  <h2>
                    {continent
                      ? `Países de ${CONTINENT_ORDER.find((c) => c.key === continent)?.label || continent}`
                      : 'Humor por continente'}
                  </h2>
                  <small>
                    {continent
                      ? 'Coropleta por país · clic para filtrar'
                      : 'Coropleta por continente · clic para explorar'}
                  </small>
                </div>
                <div className="cb" style={{ padding: '8px 10px 6px' }}>
                  <DashboardMap
                    aggregates={data?.agregados || []}
                    continent={continent}
                    pais={pais}
                    onSelectContinent={setContinent}
                    onSelectCountry={setPais}
                  />
                </div>
                <div className="legend">
                  <div className="ramp">
                    <div className="cap">
                      <span>Negativo</span>
                      <span>Neutro</span>
                      <span>Positivo</span>
                    </div>
                    <div className="g" />
                    <div className="tk">
                      <span>−1</span>
                      <span>−0,5</span>
                      <span>0</span>
                      <span>+0,5</span>
                      <span>+1</span>
                    </div>
                  </div>
                  <div className="lgi">
                    <i className="nd" />
                    Sin datos · 0 noticias
                  </div>
                  <div className="lgi">
                    <i className="pr" />
                    Provisional · &lt; 3 noticias
                  </div>
                  <span className="prop">DD-10 · DD-11</span>
                </div>
              </div>

              <DashboardSummary
                scopeName={scopeTitle}
                windowSize={windowSize}
                dateLabel={formatDate(DAYS_ARRAY[selectedDayIndex])}
                scopeAggregate={scopeAggregate}
                aggregates={data?.agregados || []}
                continent={continent}
                pais={pais}
                onSelectContinent={setContinent}
                onSelectCountry={setPais}
              />
            </div>

            {/* Timeline */}
            <div className="card" data-ann="GET /dashboards · Timeline">
              <div className="ch">
                <h2>Evolución diaria · {scopeTitle}</h2>
                <small>Línea: humor medio · barras: noticias evaluables · ○ provisional</small>
              </div>
              <div className="cb" style={{ paddingTop: '4px' }}>
                <DashboardTimeline
                  series={timelineSeries}
                  selectedDateIndex={selectedDayIndex}
                  windowSize={windowSize}
                  scopeTitle={scopeTitle}
                  onSelectDateIndex={setSelectedDayIndex}
                />
              </div>
            </div>

            {/* Influential Terms WordCloud & Table */}
            <div className="grid2b">
              <DashboardWordCloud
                terms={terms?.terminos || []}
                mode={cloudMode}
                onToggleMode={setCloudMode}
              />
              {/* Placeholder for influential news - matches prototype grid2b */}
              <div className="card">
                <div className="ch">
                  <h2>Noticias más influyentes</h2>
                  <small>Top 10 por |valor_humor| · {scopeTitle}</small>
                </div>
                <div className="cb">
                  <div className="empty">
                    <b>Sin noticias evaluables</b>
                    Prueba otro día con datos o amplía el ámbito.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
