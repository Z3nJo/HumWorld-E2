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
      <header>
        <div>
          <h2 id="breakdown-title">Desglose de palabras</h2>
          <p className="bp-news">{news.titulo}</p>
        </div>
        <button type="button" className="btn sm" onClick={() => dialogRef.current?.close()}>Cerrar</button>
      </header>
      <div className="bd">
        {loading && <p className="meta" role="status">Cargando desglose…</p>}
        {error && (
          <div className="errbox" role="alert">
            <b>No se pudo cargar el desglose</b>
            <span>{error}</span>
            <button type="button" className="btn sm" onClick={retry}>Reintentar</button>
          </div>
        )}
        {data && (
          <>
            <p className="bp-humor">
              Humor guardado{' '}
              <span className={`mono ${humorPolarity(data.valor_humor)}`}>{formatHumor(data.valor_humor)}</span>
            </p>
            {data.terminos.length ? (
              <table className="t">
                <thead>
                  <tr><th>Palabra</th><th className="num">Valor</th><th className="num">Veces</th><th className="num">Aporte</th></tr>
                </thead>
                <tbody>
                  {data.terminos.map((term) => (
                    <tr key={term.id_termino}>
                      <td>{term.palabra}</td>
                      <td className={`num ${humorPolarity(term.valor)}`}>{formatHumor(term.valor)}</td>
                      <td className="num">{term.ocurrencias}</td>
                      <td className={`num ${humorPolarity(term.aporte_humor)}`}>{formatHumor(term.aporte_humor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty"><b>Sin palabras detectadas</b>Esta noticia no tiene términos del diccionario.</div>
            )}
            <small className="meta">
              El aporte está en escala de términos, no en [-1, 1]: el humor guardado se calcula con la fórmula configurada.
            </small>
          </>
        )}
      </div>
    </dialog>
  );
};
