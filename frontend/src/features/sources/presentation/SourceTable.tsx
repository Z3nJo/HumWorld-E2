import { Fragment } from 'react';
import type { ChannelGroup } from '../domain/source';
import { CONTINENT_LABELS } from '../domain/source';

interface SourceTableProps {
  channelGroups: ChannelGroup[];
  openChannelIds: Set<number>;
  onToggleChannelOpen: (channelId: number) => void;
  onToggleSourceActive: (sourceId: number) => void;
  onToggleGroupActive: (groupId: number) => void;
}

export const SourceTable = ({
  channelGroups,
  openChannelIds,
  onToggleChannelOpen,
  onToggleSourceActive,
  onToggleGroupActive,
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
            <th style={{ width: '34px' }} aria-label="Desplegar" />
            <th>Fuente</th>
            <th>Idioma</th>
            <th>Continente</th>
            <th className="num">Canales</th>
            <th>Activa</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {channelGroups.map((group) => {
            const isOpen = openChannelIds.has(group.id);
            return (
              <Fragment key={`group-${group.id}`}>
                <tr>
                  <td>
                    <button
                      className="btn ghost sm"
                      onClick={() => onToggleChannelOpen(group.id)}
                      aria-expanded={isOpen}
                      aria-label={`Ver canales de ${group.name}`}
                    >
                      {isOpen ? '▾' : '▸'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{group.name}</div>
                    <div className="meta">
                      — <span className="backend-badge">REQUIERE BACK</span>
                    </div>
                  </td>
                  <td>
                    <span className="pill">{group.sources[0]?.language.toUpperCase() ?? '—'}</span>
                  </td>
                  <td>{CONTINENT_LABELS[group.continent]}</td>
                  <td className="num">{group.sources.length}</td>
                  <td>
                    <button
                      className={`sw ${group.isActive ? 'on' : ''}`}
                      onClick={() => onToggleGroupActive(group.id)}
                      role="switch"
                      aria-checked={group.isActive}
                      aria-label={`Activar o desactivar todos los canales de ${group.name}`}
                    />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn ghost sm"
                      disabled
                      title="REQUIERE BACK"
                      aria-label="Editar canal: REQUIERE BACK"
                    >
                      Editar
                    </button>
                    <button
                      className="btn ghost sm"
                      disabled
                      title="REQUIERE BACK"
                      aria-label="Eliminar canal: REQUIERE BACK"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>

                {isOpen && (
                  <tr className="sub">
                    <td />
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
                          {group.sources.map((feed) => (
                            <tr key={`feed-${feed.id}`}>
                              <td className="mono" style={{ fontSize: '12.5px' }}>
                                <a
                                  href={feed.feedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={feed.feedUrl}
                                >
                                  {feed.feedUrl}
                                </a>
                              </td>
                              <td>{feed.iptcCategory}</td>
                              <td>
                                <span className="locked-field">
                                  <select disabled aria-label={`País de ${feed.name}`}>
                                    <option>— Sin país —</option>
                                  </select>
                                  <span className="backend-badge">REQUIERE BACK</span>
                                </span>
                              </td>
                              <td>
                                <button
                                  className={`sw ${feed.active ? 'on' : ''}`}
                                  onClick={() => onToggleSourceActive(feed.id)}
                                  role="switch"
                                  aria-checked={feed.active}
                                  aria-label={`Activar o desactivar ${feed.name}`}
                                />
                              </td>
                            </tr>
                          ))}
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
