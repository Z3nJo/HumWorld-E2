import { RevealText } from './ScrollText';
import './WhatIs.css';

export const WhatIs = () => (
  <section id="que-es" aria-labelledby="qe-t" className="lp-section lp-whatis">
    <div className="lp-eyebrow">Qué es</div>
    <RevealText
      as="h2"
      id="qe-t"
      className="lp-whatis__statement"
      text="Un termómetro del tono de las noticias, no de la opinión pública."
    />
    <div className="lp-stack lp-whatis__body">
      <p>
        Cada noticia capturada recibe un valor numérico de humor entre −1 y +1, calculado con un
        algoritmo propio a partir de un diccionario de términos en español e inglés. Esos valores
        se agregan por día, continente y país.
      </p>
      <p>
        Las noticias se clasifican con los temas de primer nivel de IPTC Media Topics, de modo que
        puedes ver qué asuntos empujan el humor de cada región hacia uno u otro extremo.
      </p>
    </div>
  </section>
);
