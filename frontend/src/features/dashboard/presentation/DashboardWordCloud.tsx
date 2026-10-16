import React from 'react';
import type { InfluentialTerm, CloudMode } from '../domain/dashboard';
import { formatHumor } from '../domain/countries';

interface DashboardWordCloudProps {
  terms: InfluentialTerm[];
  mode: CloudMode;
  onToggleMode: (mode: CloudMode) => void;
}

export const DashboardWordCloud: React.FC<DashboardWordCloudProps> = ({
  terms,
  mode,
  onToggleMode,
}) => {
  if (!terms.length) {
    return (
      <div className="card" data-ann="GET /dashboards/nube-palabras · E3-H03 · DD-02 PROPUESTA">
        <div className="ch">
          <h2>Términos influyentes</h2>
          <div className="seg">
            <button
              className={mode === 'nube' ? 'on' : ''}
              onClick={() => onToggleMode('nube')}
            >
              Nube
            </button>
            <button
              className={mode === 'tabla' ? 'on' : ''}
              onClick={() => onToggleMode('tabla')}
            >
              Tabla
            </button>
          </div>
        </div>
        <div className="cb" id="cloud">
          <div className="empty">
            <b>Sin términos</b>
            No hay noticias evaluables en este ámbito y fecha.
          </div>
        </div>
      </div>
    );
  }

  const mx = terms[0].peso;
  const mn = terms[terms.length - 1].peso;

  // Alternate placement like the prototype: odd pushes, even unshifts
  const ord: InfluentialTerm[] = [];
  terms.forEach((w, i) => {
    if (i % 2) ord.push(w);
    else ord.unshift(w);
  });

  return (
    <div className="card" data-ann="GET /dashboards/nube-palabras · E3-H03 · DD-02 PROPUESTA">
      <div className="ch">
        <h2>Términos influyentes</h2>
        <div className="seg">
          <button
            className={mode === 'nube' ? 'on' : ''}
            onClick={() => onToggleMode('nube')}
          >
            Nube
          </button>
          <button
            className={mode === 'tabla' ? 'on' : ''}
            onClick={() => onToggleMode('tabla')}
          >
            Tabla
          </button>
        </div>
      </div>

      <div className="cb" id="cloud">
        {mode === 'nube' ? (
          <>
            <div
              className="cloud"
              role="img"
              aria-label={`Nube de ${terms.length} términos más influyentes`}
            >
              {ord.map((w) => {
                const t = mx === mn ? 1 : (w.peso - mn) / (mx - mn);
                const fontSize = Math.round(14 + t * 34);
                return (
                  <span
                    key={w.id_termino}
                    style={{
                      fontSize: `${fontSize}px`,
                      color: w.aporte_total < 0 ? 'var(--neg)' : 'var(--pos)',
                      fontWeight: t > 0.5 ? 500 : 400,
                      fontStyle: w.idioma === 'en' ? 'italic' : 'normal',
                    }}
                    title={`${w.termino} · Σ|aporte| ${w.peso.toFixed(
                      2
                    )} · Σaporte ${formatHumor(w.aporte_total)} · ${w.frecuencia} apariciones`}
                  >
                    {w.termino}
                  </span>
                );
              })}
            </div>
            <div
              className="row meta"
              style={{
                justifyContent: 'space-between',
                borderTop: '1px solid var(--line2)',
                paddingTop: '10px',
              }}
            >
              <span>Tamaño: Σ|aporte_humor| · color: signo · cursiva: inglés</span>
              <span>
                <span style={{ color: 'var(--neg)' }}>■</span> negativo{' '}
                <span style={{ color: 'var(--pos)' }}>■</span> positivo
              </span>
            </div>
          </>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Término</th>
                <th>Idioma</th>
                <th className="num">Σ|aporte|</th>
                <th className="num">Σ aporte</th>
                <th className="num">Frec.</th>
              </tr>
            </thead>
            <tbody>
              {terms.slice(0, 14).map((w) => (
                <tr key={w.id_termino}>
                  <td>
                    <span className="row" style={{ gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          height: '6px',
                          width: `${Math.round((w.peso / mx) * 60)}px`,
                          background:
                            w.aporte_total < 0 ? 'var(--neg)' : 'var(--pos)',
                          borderRadius: '3px',
                        }}
                      />
                      {w.termino}
                    </span>
                  </td>
                  <td className="mono">{w.idioma}</td>
                  <td className="num">{w.peso.toFixed(2)}</td>
                  <td className="num">{formatHumor(w.aporte_total)}</td>
                  <td className="num">{w.frecuencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
