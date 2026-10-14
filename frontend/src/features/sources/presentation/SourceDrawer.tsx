import { useEffect, useState } from 'react';
import { COUNTRIES, COUNTRY_BY_CODE } from '../domain/countries';
import type {
  ChannelWithSources,
  Continent,
  CreateSourceBatchInput,
  IptcCategory,
  Language,
} from '../domain/source';
import {
  CONTINENT_LABELS,
  CONTINENTS,
  IPTC_CATEGORIES,
  IPTC_CATEGORY_LABELS,
} from '../domain/source';
import { isValidHttpUrl } from '../domain/sourceValidators';
import type { EditSourceDrawerInput } from '../application/useSources';

interface SourceDrawerProps {
  isOpen: boolean;
  editingChannel: ChannelWithSources | null;
  onClose: () => void;
  onCreateBatch: (input: CreateSourceBatchInput) => Promise<unknown>;
  onEditBatch: (
    input: EditSourceDrawerInput,
    existing: ChannelWithSources,
  ) => Promise<unknown>;
  onShowErrorToast?: (msg: string) => void;
}

interface DrawerFormProps {
  editingChannel: ChannelWithSources | null;
  onClose: () => void;
  onCreateBatch: (input: CreateSourceBatchInput) => Promise<unknown>;
  onEditBatch: (
    input: EditSourceDrawerInput,
    existing: ChannelWithSources,
  ) => Promise<unknown>;
  onShowErrorToast?: (msg: string) => void;
}

const DrawerForm = ({
  editingChannel,
  onClose,
  onCreateBatch,
  onEditBatch,
  onShowErrorToast,
}: DrawerFormProps) => {
  const isEditing = Boolean(editingChannel);

  // Determine initial language for editing
  const initialLanguage = (): 'es' | 'en' | 'mixed' => {
    if (!editingChannel || editingChannel.sources.length === 0) return 'es';
    const langs = Array.from(new Set(editingChannel.sources.map((s) => s.language)));
    if (langs.length > 1) return 'mixed';
    return langs[0] ?? 'es';
  };

  const [nombre, setNombre] = useState(editingChannel?.name ?? '');
  const [url, setUrl] = useState(editingChannel?.siteUrl ?? '');
  const [idioma, setIdioma] = useState<'es' | 'en' | 'mixed'>(initialLanguage);
  const [continente, setContinente] = useState<Continent>(
    editingChannel?.continent ?? 'America',
  );
  const [pais, setPais] = useState<string | null>(editingChannel?.country ?? null);

  const [canales, setCanales] = useState<
    Array<{
      id?: number;
      url_rss: string;
      categoria: IptcCategory;
    }>
  >(
    editingChannel && editingChannel.sources.length > 0
      ? editingChannel.sources.map((s) => ({
          id: s.id,
          url_rss: s.feedUrl,
          categoria: s.category,
        }))
      : [
          {
            url_rss: '',
            categoria: 'politics',
          },
        ],
  );

  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // When continente changes, reset country if it no longer applies (unless it matches the current country's continent or is null)
  const handleContinentChange = (newCont: Continent) => {
    setContinente(newCont);
    if (pais) {
      const countryObj = COUNTRY_BY_CODE.get(pais);
      if (countryObj && countryObj.continent !== newCont) {
        setPais(null);
      }
    }
  };

  const handleAddCanal = () => {
    setCanales((prev) => [
      ...prev,
      {
        url_rss: '',
        categoria: 'politics',
      },
    ]);
  };

  const handleRemoveCanal = (index: number) => {
    setCanales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err: Record<string, string> = {};
    if (!nombre.trim()) {
      err.nombre = 'Campo obligatorio';
    }
    if (!url.trim()) {
      // url can be empty or validated? Prototipo checks: if(!/^https?:\/\/\S+\.\S+/.test(d.url)) e.url='URL no válida';
      err.url = 'URL no válida';
    } else if (!isValidHttpUrl(url.trim())) {
      err.url = 'URL no válida';
    }

    canales.forEach((c, i) => {
      if (!c.url_rss.trim() || !isValidHttpUrl(c.url_rss.trim())) {
        err[`rss${i}`] = 'URL RSS no válida';
      }
    });

    setFormErr(err);

    if (Object.keys(err).length > 0) {
      onShowErrorToast?.('Revisa los campos marcados');
      return;
    }

    setSubmitting(true);

    try {
      if (editingChannel) {
        await onEditBatch(
          {
            channelId: editingChannel.id,
            nombre: nombre.trim(),
            url_sitio: url.trim(),
            continente,
            pais: pais || null,
            idioma,
            canales: canales.map((c) => ({
              id: c.id,
              url_feed: c.url_rss.trim(),
              categoria_iptc: c.categoria,
            })),
          },
          editingChannel,
        );
      } else {
        const feedLanguage: Language = idioma === 'mixed' ? 'es' : idioma;
        await onCreateBatch({
          channel: {
            name: nombre.trim(),
            siteUrl: url.trim(),
            continent: continente,
            country: pais || null,
            active: true,
          },
          sources: canales.map((c) => ({
            name: `${nombre.trim()} · ${IPTC_CATEGORY_LABELS[c.categoria] || c.categoria}`.slice(
              0,
              150,
            ),
            feedUrl: c.url_rss.trim(),
            iptcCategory: c.categoria,
            language: feedLanguage,
            active: true,
          })),
        });
      }
      onClose();
    } catch {
      // The API error is handled by the caller toast and the drawer stays open
    } finally {
      setSubmitting(false);
    }
  };

  // Filter country options for current continent; include current country even if outside catalog
  const filteredCountries = COUNTRIES.filter((c) => c.continent === continente);
  const isCustomCountry =
    pais && !filteredCountries.some((c) => c.code === pais);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
      <div className="bd">
        <label className="f" htmlFor="src-name">
          Nombre
          <input
            id="src-name"
            className={`inp ${formErr.nombre ? 'err' : ''}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        {formErr.nombre && <span className="errtxt">{formErr.nombre}</span>}

        <label className="f" htmlFor="src-site-url">
          URL del sitio
          <input
            id="src-site-url"
            className={`inp ${formErr.url ? 'err' : ''}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
        {formErr.url && <span className="errtxt">{formErr.url}</span>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label className="f" htmlFor="src-lang">
            Idioma
            <select
              id="src-lang"
              className="sel"
              value={idioma}
              onChange={(e) => setIdioma(e.target.value as 'es' | 'en' | 'mixed')}
            >
              {isEditing && initialLanguage() === 'mixed' && (
                <option value="mixed">Mixto (sin cambios)</option>
              )}
              <option value="es">Español (es)</option>
              <option value="en">Inglés (en)</option>
            </select>
          </label>

          <label className="f" htmlFor="src-cont">
            Continente
            <select
              id="src-cont"
              className="sel"
              value={continente}
              onChange={(e) => handleContinentChange(e.target.value as Continent)}
            >
              {CONTINENTS.map((k) => (
                <option key={k} value={k}>
                  {CONTINENT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="f" htmlFor="src-country">
          País
          <select
            id="src-country"
            className="sel"
            value={pais ?? ''}
            onChange={(e) => setPais(e.target.value || null)}
          >
            <option value="">— Sin país —</option>
            {isCustomCountry && (
              <option value={pais!}>
                {pais} ({pais})
              </option>
            )}
            {filteredCountries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div
          className="row"
          style={{ justifyContent: 'space-between', marginTop: '6px' }}
        >
          <b style={{ font: '500 17px var(--serif)' }}>Canales RSS</b>
          <button
            type="button"
            className="btn sm"
            onClick={handleAddCanal}
            disabled={submitting}
          >
            + Añadir canal
          </button>
        </div>
        <p className="help" style={{ margin: '-8px 0 0' }}>
          Solo canales RSS; no se admite web scraping.
        </p>

        {canales.map((c, i) => (
          <div
            key={`canal-${c.id ?? i}`}
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
              <span className="meta">Canal {i + 1}</span>
              {canales.length > 1 && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => handleRemoveCanal(i)}
                  disabled={submitting}
                >
                  Quitar
                </button>
              )}
            </div>

            <label className="f" htmlFor={`src-feed-url-${i}`}>
              URL RSS
              <input
                id={`src-feed-url-${i}`}
                className={`inp ${formErr[`rss${i}`] ? 'err' : ''}`}
                value={c.url_rss}
                onChange={(e) => {
                  const val = e.target.value;
                  setCanales((prev) =>
                    prev.map((item, idx) =>
                      idx === i ? { ...item, url_rss: val } : item,
                    ),
                  );
                }}
                placeholder="https://…/rss"
              />
            </label>
            {formErr[`rss${i}`] && (
              <span className="errtxt">{formErr[`rss${i}`]}</span>
            )}

            <label className="f">
              Categoría IPTC
              <select
                className="sel"
                value={c.categoria}
                onChange={(e) => {
                  const val = e.target.value as IptcCategory;
                  setCanales((prev) =>
                    prev.map((item, idx) =>
                      idx === i ? { ...item, categoria: val } : item,
                    ),
                  );
                }}
              >
                {IPTC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {IPTC_CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      <footer>
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button type="submit" className="btn pri" disabled={submitting}>
          {submitting
            ? 'Guardando...'
            : isEditing
            ? 'Guardar cambios'
            : 'Crear fuente'}
        </button>
      </footer>
    </form>
  );
};

export const SourceDrawer = ({
  isOpen,
  editingChannel,
  onClose,
  onCreateBatch,
  onEditBatch,
  onShowErrorToast,
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
    <div
      id="ov"
      className="on"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <div className="meta" style={{ marginBottom: '6px' }}>
              {editingChannel
                ? `Editar fuente #${editingChannel.id}`
                : 'Nueva fuente'}
            </div>
            <h3>
              {editingChannel
                ? editingChannel.name
                : 'Registrar fuente RSS'}
            </h3>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <DrawerForm
          key={editingChannel ? `edit-${editingChannel.id}` : 'create'}
          editingChannel={editingChannel}
          onClose={onClose}
          onCreateBatch={onCreateBatch}
          onEditBatch={onEditBatch}
          onShowErrorToast={onShowErrorToast}
        />
      </div>
    </div>
  );
};
