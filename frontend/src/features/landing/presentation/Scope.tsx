import './Scope.css';

const LISTS = [
  {
    title: 'Lo que hace',
    marker: '+',
    tone: 'pos',
    items: [
      'Captura noticias solo desde canales RSS de medios y fuentes oficiales.',
      'Analiza textos en español e inglés con un diccionario de términos editable.',
      'Clasifica por IPTC Media Topics, solo en el primer nivel.',
      'Marca como provisional cualquier agregado con pocas noticias.',
    ],
  },
  {
    title: 'Lo que no hace',
    marker: '−',
    tone: 'neg',
    items: [
      'No hace web scraping ni lee el cuerpo completo de los artículos.',
      'No evalúa noticias en otros idiomas.',
      'No mide la opinión de las personas ni detecta ironía o contexto.',
      'No tiene autenticación: es un prototipo académico, sin cuentas de usuario.',
    ],
  },
];

export const Scope = () => (
  <section id="alcance" aria-labelledby="al-t" className="lp-section lp-section--end">
    <div className="lp-scope">
      <div className="lp-stack lp-scope__intro">
        <div className="lp-eyebrow">Nota del editor</div>
        <h2 id="al-t" className="lp-scope__title">Transparencia y alcance</h2>
        <p className="lp-scope__lead">
          El humor que mostramos es el tono de lo publicado, medido con reglas explícitas. Conviene
          leerlo como un indicador, no como un veredicto.
        </p>
      </div>
      {LISTS.map(({ title, marker, tone, items }) => (
        <div key={title} className="lp-stack lp-scope__col">
          <h3 className="lp-scope__heading">{title}</h3>
          <ul className="lp-stack lp-scope__list">
            {items.map((item) => (
              <li key={item} className="lp-scope__item">
                <span aria-hidden="true" className={`mono lp-tone-${tone}`}>
                  {marker}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);
