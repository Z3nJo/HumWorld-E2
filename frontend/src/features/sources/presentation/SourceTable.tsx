import { Fragment } from 'react';
import { COUNTRY_BY_CODE } from '../domain/countries';
import type { ChannelWithSources } from '../domain/source';
import { CONTINENT_LABELS, IPTC_CATEGORY_LABELS } from '../domain/source';

interface SourceTableProps {
  channelGroups: ChannelWithSources[];
  openChannelIds: Set<number>;
  onToggleChannelOpen: (channelId: number) => void;
  onToggleSourceActive: (sourceId: number) => void;
  onToggleGroupActive: (groupId: number) => void;
  onEditChannel?: (channel: ChannelWithSources) => void;
  onDeleteChannel?: (channel: ChannelWithSources) => void;
}

export const SourceTable = ({
  channelGroups,
  openChannelIds,
  onToggleChannelOpen,
  onToggleSourceActive,
  onToggleGroupActive,
  onEditChannel,
  onDeleteChannel,
}: SourceTableProps) => {
  if (channelGroups.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <b>No hay fuentes con estos filtros</b>
          Cambia el continente o el estado.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="t">
        <thead>
          <tr>
            <th style={{ width: '34px' }}></th>
            <th>Fuente</th>
            <th>Idioma</th>
            <th>Continente</th>
            <th className="num">Canales</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {channelGroups.map((s) => {
            const isOpen = openChannelIds.has(s.id);
            const countryInfo = s.country ? COUNTRY_BY_CODE.get(s.country) : null;

            return (
              <Fragment key={`channel-${s.id}`}>
                <tr>
                  <td>
                    <button
                      className="btn ghost sm"
                      onClick={() => onToggleChannelOpen(s.id)}
                      aria-expanded={isOpen}
                      aria-label="Ver canales"
                    >
                      {isOpen ? '▾' : '▸'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="meta">{s.siteUrl || '—'}</div>
                  </td>
                  <td>
                    {s.languages.length === 0 ? (
                      <span className="meta">—</span>
                    ) : (
                      <span className="row" style={{ gap: '4px' }}>
                        {s.languages.map((lang) => (
                          <span key={lang} className="pill">
                            {lang.toUpperCase()}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>{CONTINENT_LABELS[s.continent]}</td>
                  <td className="num">{s.sources.length}</td>
                  <td>
                    <button
                      className={`sw ${s.active ? 'on' : ''}`}
                      onClick={() => onToggleGroupActive(s.id)}
                      role="switch"
                      aria-checked={s.active}
                      aria-label={`Activar ${s.name}`}
                    ></button>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => onEditChannel?.(s)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn ghost sm"
                      style={{ color: 'var(--neg)' }}
                      onClick={() => onDeleteChannel?.(s)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>

                {isOpen && (
                  <tr className="sub">
                    <td></td>
                    <td colSpan={6} style={{ padding: '4px 12px 14px' }}>
                      <table
                        className="t"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line2)',
                          borderRadius: '6px',
                        }}
                      >
                        <thead>
                          <tr>
                            <th>URL del canal RSS</th>
                            <th>Categoría IPTC</th>
                            <th>País</th>
                            <th>Activo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.sources.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="meta" style={{ textAlign: 'center', padding: '12px' }}>
                                Sin canales RSS registrados
                              </td>
                            </tr>
                          ) : (
                            s.sources.map((c) => (
                              <tr key={`source-${c.id}`}>
                                <td className="mono" style={{ fontSize: '12.5px' }}>
                                  {c.feedUrl}
                                </td>
                                <td>{IPTC_CATEGORY_LABELS[c.category] || c.category}</td>
                                <td>
                                  {countryInfo ? (
                                    <>
                                      {countryInfo.name}{' '}
                                      <span className="meta">{countryInfo.code}</span>
                                    </>
                                  ) : s.country ? (
                                    <>
                                      {s.country} <span className="meta">{s.country}</span>
                                    </>
                                  ) : (
                                    <span className="meta">—</span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className={`sw ${c.active ? 'on' : ''}`}
                                    onClick={() => onToggleSourceActive(c.id)}
                                    role="switch"
                                    aria-checked={c.active}
                                    aria-label="Activar canal"
                                  ></button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

