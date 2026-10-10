import { useEffect, useState } from 'react';
import type {
  Continent,
  CreateSourceBatchInput,
  IptcCategory,
  Language,
  ReplaceSourceInput,
  Source,
} from '../domain/source';
import { CONTINENT_LABELS, CONTINENTS, IPTC_CATEGORIES } from '../domain/source';
import type { SourceValidationErrors } from '../domain/sourceValidators';
import { validateCreateBatch, validateReplaceSource } from '../domain/sourceValidators';

interface SourceDrawerProps {
  isOpen: boolean;
  editingSource: Source | null;
  onClose: () => void;
  onCreateBatch: (input: CreateSourceBatchInput) => Promise<unknown>;
  onUpdateSource: (id: number, input: ReplaceSourceInput) => Promise<unknown>;
}

interface DrawerFormProps {
  editingSource: Source | null;
  onClose: () => void;
  onCreateBatch: (input: CreateSourceBatchInput) => Promise<unknown>;
  onUpdateSource: (id: number, input: ReplaceSourceInput) => Promise<unknown>;
}

const DrawerForm = ({
  editingSource,
  onClose,
  onCreateBatch,
  onUpdateSource,
}: DrawerFormProps) => {
  // Batch creation state
  const [channelName, setChannelName] = useState('');
  const [channelContinent, setChannelContinent] = useState<Continent>('Europa');
  const [batchFeeds, setBatchFeeds] = useState<
    Array<{
      name: string;
      feedUrl: string;
      iptcCategory: IptcCategory;
      language: Language;
    }>
  >([
    {
      name: 'Portada',
      feedUrl: '',
      iptcCategory: 'politics',
      language: 'es',
    },
  ]);

  // Single edit state
  const [editName, setEditName] = useState(editingSource?.name ?? '');
  const [editFeedUrl, setEditFeedUrl] = useState(editingSource?.feedUrl ?? '');
  const [editIptc, setEditIptc] = useState<IptcCategory>(
    editingSource?.iptcCategory ?? 'politics',
  );
  const [editLanguage, setEditLanguage] = useState<Language>(
    editingSource?.language ?? 'es',
  );
  const [editActive, setEditActive] = useState(editingSource?.active ?? true);

  const [errors, setErrors] = useState<SourceValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleAddFeedRow = () => {
    setBatchFeeds((prev) => [
      ...prev,
      {
        name: '',
        feedUrl: '',
        iptcCategory: 'politics',
        language: 'es',
      },
    ]);
  };

  const handleRemoveFeedRow = (index: number) => {
    setBatchFeeds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingSource) {
        const replaceInput: ReplaceSourceInput = {
          name: editName,
          feedUrl: editFeedUrl,
          iptcCategory: editIptc,
          language: editLanguage,
          active: editActive,
        };
        const editErrors = validateReplaceSource(replaceInput);
        if (Object.keys(editErrors).length > 0) {
          setErrors({
            sources: [editErrors],
          });
          setSubmitting(false);
          return;
        }
        await onUpdateSource(editingSource.id, replaceInput);
      } else {
        const batchInput: CreateSourceBatchInput = {
          channel: {
            name: channelName,
            continent: channelContinent,
          },
          sources: batchFeeds.map((f) => ({
            name: f.name,
            feedUrl: f.feedUrl,
            iptcCategory: f.iptcCategory,
            language: f.language,
            active: true,
          })),
        };
        const batchErrors = validateCreateBatch(batchInput);
        if (Object.keys(batchErrors).length > 0) {
          setErrors(batchErrors);
          setSubmitting(false);
          return;
        }
        await onCreateBatch(batchInput);
      }
      onClose();
    } catch {
      // error handled by caller toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
      <div className="bd">
        {editingSource ? (
          // Edit single source
          <>
            <label className="f">
              Medio / Canal asociado
              <input
                className="inp"
                value={editingSource.channel.name}
                disabled
                style={{ background: 'var(--paper2)' }}
              />
            </label>

            <label className="f locked-control">
              URL del sitio
              <input
                className="inp mono"
                disabled
                placeholder="https://ejemplo.com"
                aria-label="URL del sitio: REQUIERE BACK"
                style={{ background: 'var(--paper2)' }}
              />
              <span className="backend-help">REQUIERE BACK · El backend aún no expone la URL del sitio.</span>
            </label>

            <label className="f">
              Nombre del canal
              <input
                className={`inp ${errors.sources?.[0]?.name ? 'err' : ''}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="p. ej. Portada, Internacional"
              />
              {errors.sources?.[0]?.name && (
                <span className="errtxt">{errors.sources[0].name}</span>
              )}
            </label>

            <label className="f">
              URL del canal RSS
              <input
                className={`inp mono ${errors.sources?.[0]?.feedUrl ? 'err' : ''}`}
                value={editFeedUrl}
                onChange={(e) => setEditFeedUrl(e.target.value)}
                placeholder="https://ejemplo.com/rss.xml"
              />
              {errors.sources?.[0]?.feedUrl && (
                <span className="errtxt">{errors.sources[0].feedUrl}</span>
              )}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label className="f">
                Idioma
                <select
                  className="sel"
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value as Language)}
                >
                  <option value="es">Español (es)</option>
                  <option value="en">Inglés (en)</option>
                </select>
              </label>

              <label className="f">
                Categoría IPTC
                <select
                  className="sel"
                  value={editIptc}
                  onChange={(e) => setEditIptc(e.target.value as IptcCategory)}
                >
                  {IPTC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="f" style={{ marginTop: '8px' }}>
              Estado activo
              <span className="row" style={{ gap: '10px' }}>
                <button
                  type="button"
                  className={`sw ${editActive ? 'on' : ''}`}
                  onClick={() => setEditActive((prev) => !prev)}
                  role="switch"
                  aria-checked={editActive}
                  aria-label="Estado activo del canal"
                />
                <span className="help">{editActive ? 'Activo (se captura)' : 'Inactivo'}</span>
              </span>
            </label>
          </>
        ) : (
          // Create batch
          <>
            <label className="f">
              Nombre del medio / canal
              <input
                className={`inp ${errors.channelName ? 'err' : ''}`}
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="p. ej. El País, BBC News, Clarín"
              />
              {errors.channelName && <span className="errtxt">{errors.channelName}</span>}
            </label>

            <label className="f locked-control">
              URL del sitio
              <input
                className="inp mono"
                disabled
                placeholder="https://ejemplo.com"
                aria-label="URL del sitio: REQUIERE BACK"
                style={{ background: 'var(--paper2)' }}
              />
              <span className="backend-help">REQUIERE BACK · El backend aún no expone la URL del sitio.</span>
            </label>

            <label className="f">
              Continente
              <select
                className="sel"
                value={channelContinent}
                onChange={(e) => setChannelContinent(e.target.value as Continent)}
              >
                {CONTINENTS.map((c) => (
                  <option key={c} value={c}>
                    {CONTINENT_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                marginTop: '12px',
                borderTop: '1px solid var(--line2)',
                paddingTop: '12px',
              }}
            >
              <b style={{ font: '500 17px var(--serif)' }}>Canales RSS</b>
              <button type="button" className="btn sm" onClick={handleAddFeedRow}>
                + Añadir canal
              </button>
            </div>
            <p className="help" style={{ marginTop: '-6px' }}>
              Solo canales RSS válidos; no se admite web scraping.
            </p>

            {batchFeeds.map((feed, idx) => {
              const feedErr = errors.sources?.[idx];
              return (
                <div
                  key={`feed-row-${idx}`}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="meta">Canal {idx + 1}</span>
                    {batchFeeds.length > 1 && (
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ color: 'var(--neg)' }}
                        onClick={() => handleRemoveFeedRow(idx)}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label className="f">
                    Nombre del canal
                    <input
                      className={`inp ${feedErr?.name ? 'err' : ''}`}
                      value={feed.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchFeeds((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, name: val } : f)),
                        );
                      }}
                      placeholder="p. ej. Portada, Economía"
                    />
                    {feedErr?.name && <span className="errtxt">{feedErr.name}</span>}
                  </label>

                  <label className="f">
                    URL RSS
                    <input
                      className={`inp mono ${feedErr?.feedUrl ? 'err' : ''}`}
                      value={feed.feedUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchFeeds((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, feedUrl: val } : f)),
                        );
                      }}
                      placeholder="https://ejemplo.com/rss.xml"
                    />
                    {feedErr?.feedUrl && <span className="errtxt">{feedErr.feedUrl}</span>}
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                    }}
                  >
                    <label className="f">
                      Categoría IPTC
                      <select
                        className="sel"
                        value={feed.iptcCategory}
                        onChange={(e) => {
                          const val = e.target.value as IptcCategory;
                          setBatchFeeds((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, iptcCategory: val } : f)),
                          );
                        }}
                      >
                        {IPTC_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="f locked-control">
                      País
                      <select disabled aria-label={`País del canal ${idx + 1}`}>
                        <option>— Sin país —</option>
                      </select>
                      <span className="backend-help">REQUIERE BACK · El backend aún no expone país.</span>
                    </label>

                    <label className="f">
                      Idioma
                      <select
                        className="sel"
                        value={feed.language}
                        onChange={(e) => {
                          const val = e.target.value as Language;
                          setBatchFeeds((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, language: val } : f)),
                          );
                        }}
                      >
                        <option value="es">Español (es)</option>
                        <option value="en">Inglés (en)</option>
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <footer>
        <button type="button" className="btn" onClick={onClose} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="btn pri" disabled={submitting}>
          {submitting
            ? 'Guardando...'
            : editingSource
            ? 'Guardar cambios'
            : 'Crear fuente'}
        </button>
      </footer>
    </form>
  );
};

export const SourceDrawer = ({
  isOpen,
  editingSource,
  onClose,
  onCreateBatch,
  onUpdateSource,
}: SourceDrawerProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ov on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <div className="meta" style={{ marginBottom: '6px' }}>
              {editingSource ? `Editar fuente #${editingSource.id}` : 'Nueva fuente RSS'}
            </div>
            <h3>
              {editingSource
                ? `Editar canal de ${editingSource.channel.name}`
                : 'Registrar medio y canales RSS'}
            </h3>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <DrawerForm
          key={editingSource ? `edit-${editingSource.id}` : 'create'}
          editingSource={editingSource}
          onClose={onClose}
          onCreateBatch={onCreateBatch}
          onUpdateSource={onUpdateSource}
        />
      </div>
    </div>
  );
};
