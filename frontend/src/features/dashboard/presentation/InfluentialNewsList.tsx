import React from 'react';
import type { InfluentialNews } from '../domain/dashboard';
import { CONTINENT_ORDER, COUNTRIES_BY_ISO, formatHumor } from '../domain/countries';
import { humorPolarity, safeNewsUrl, type Polarity } from '../domain/news';

interface InfluentialNewsListProps {
  news: InfluentialNews[];
  scopeTitle: string;
}

const POLARITY_LABEL: Record<Polarity, string> = {
  pos: 'Positiva',
  neg: 'Negativa',
  neu: 'Neutra',
};

const dateFormat = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'UTC',
  dateStyle: 'short',
  timeStyle: 'short',
  hourCycle: 'h23',
});

function sourceRegion(item: InfluentialNews): string {
  if (item.pais) return COUNTRIES_BY_ISO[item.pais]?.es ?? item.pais;
  return CONTINENT_ORDER.find((c) => c.key === item.continente)?.label ?? item.continente;
}

export const InfluentialNewsList: React.FC<InfluentialNewsListProps> = ({ news, scopeTitle }) => (
  <div className="card">
    <div className="ch">
      <h2>Noticias más influyentes</h2>
      <small>Top 10 por |valor_humor| · {scopeTitle}</small>
    </div>
    <div className="cb">
      {news.length ? (
        <ol className="influential-news">
          {news.map((item, index) => {
            const polarity = humorPolarity(item.valor_humor);
            const href = safeNewsUrl(item.url);
            return (
              <li key={item.id_noticia}>
                <details>
                  <summary>
                    <span className="in-rank">{index + 1}</span>
                    <span className="in-title">{item.titulo}</span>
                    <span className={`in-humor mono ${polarity}`}>{formatHumor(item.valor_humor)}</span>
                  </summary>
                  <dl className="in-detail">
                    <dt>Titular</dt>
                    <dd>{item.titulo}</dd>
                    <dt>Humor</dt>
                    <dd>
                      <span className={`mono ${polarity}`}>{formatHumor(item.valor_humor)}</span>{' '}
                      <span className={polarity}>{POLARITY_LABEL[polarity]}</span>
                    </dd>
                    <dt>Registrada</dt>
                    <dd>{dateFormat.format(new Date(item.fecha_registro))} UTC</dd>
                    <dt>Fuente</dt>
                    <dd>{item.canal} · {sourceRegion(item)}</dd>
                    <dt>Original</dt>
                    <dd>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">Ver noticia original</a>
                      ) : (
                        'El enlace original no está disponible.'
                      )}
                    </dd>
                  </dl>
                </details>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="empty">
          <b>Sin noticias evaluables</b>
          Prueba otro día con datos o amplía el ámbito.
        </div>
      )}
    </div>
  </div>
);
