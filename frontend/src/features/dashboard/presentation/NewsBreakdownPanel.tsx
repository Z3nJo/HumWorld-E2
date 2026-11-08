import React, { useEffect, useRef } from 'react';
import type { InfluentialNews } from '../domain/dashboard';
import { formatHumor } from '../domain/countries';
import { humorPolarity } from '../domain/news';
import { useNewsBreakdown } from '../application/useNewsBreakdown';

interface NewsBreakdownPanelProps {
  news: InfluentialNews;
  onClose: () => void;
}

export const NewsBreakdownPanel: React.FC<NewsBreakdownPanelProps> = ({ news, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, error, loading, retry } = useNewsBreakdown(news.id_noticia);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="breakdown-panel" aria-labelledby="breakdown-title" onClose={onClose}>
      <header className="bp-head">
        <h2 id="breakdown-title">Desglose de palabras</h2>
        <button type="button" onClick={() => dialogRef.current?.close()}>Cerrar</button>
      </header>
      <p className="bp-news">{news.titulo}</p>
      {loading && <p role="status">Cargando desglose…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>Reintentar</button>
        </div>
      )}
      {data && (
        <>
          <p>
            Humor guardado:{' '}
            <span className={`mono ${humorPolarity(data.valor_humor)}`}>{formatHumor(data.valor_humor)}</span>
          </p>
          <table className="bp-table">
            <thead>
              <tr><th>Palabra</th><th>Valor</th><th>Veces</th><th>Aporte</th></tr>
            </thead>
            <tbody>
              {data.terminos.map((term) => (
                <tr key={term.id_termino}>
                  <td>{term.palabra}</td>
                  <td className={`mono ${humorPolarity(term.valor)}`}>{formatHumor(term.valor)}</td>
                  <td className="mono">{term.ocurrencias}</td>
                  <td className={`mono ${humorPolarity(term.aporte_humor)}`}>{formatHumor(term.aporte_humor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small>
            El aporte está en escala de términos, no en [-1, 1]: el humor guardado se calcula con la fórmula configurada.
          </small>
        </>
      )}
    </dialog>
  );
};
