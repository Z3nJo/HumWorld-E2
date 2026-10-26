import './Stats.css';

// Fixed by the system's scope: the humor scale, IPTC first-level topics (17), the continents
// with a seeded source, and the languages the dictionary covers.
export const Stats = () => (
  <section aria-labelledby="st-t" className="lp-section">
    <div className="lp-section__row">
      <div className="lp-eyebrow">Cifras</div>
      <h2 id="st-t" className="lp-section__title">HumWorld en números</h2>
      <p className="lp-section__note">
        Un solo valor por noticia, agregado por tema, día y región del mundo.
      </p>
    </div>
    <dl className="lp-bento">
      <div className="lp-bento__card lp-bento__card--glow">
        <dt>Escala de humor</dt>
        <dd>−1 a +1</dd>
      </div>
      <div className="lp-bento__card lp-bento__card--wide">
        <dt>Temas IPTC de primer nivel</dt>
        <dd>17</dd>
      </div>
      <div className="lp-bento__card">
        <dt>Continentes</dt>
        <dd>6</dd>
      </div>
      <div className="lp-bento__card">
        <dt>Idiomas analizados</dt>
        <dd>ES / EN</dd>
      </div>
    </dl>
  </section>
);
