# Evidencia de validacion E2-H03

Fecha de revalidacion local: 2026-09-28, sobre `main` en `52349a6` (Docker Compose y
PostgreSQL 16). La historia se integro con los PR #32 a #34; el ultimo se fusiono el 2026-09-25.

## Alcance implementado

Se incorporo el soporte completo bilingue (espanol e ingles) en el motor de sentimiento
y la carga reproducible del lexico inicial de terminos curados:

- **Lexico inicial curado:** 30 pares de conceptos traducidos (`SENTIMENT_LEXICON`) en
  `app/seeds/sentiment.py`, con valores de sentimiento armonizados en la escala `[-10, 10]` y
  precision estricta de un decimal (p. ej. `alegría`/`joy` 8.0, `paz`/`peace` 6.0,
  `amor`/`love` 9.0, `crisis`/`crisis` -6.0, `odio`/`hate` -9.0, `guerra`/`war` -9.0).
- **Tratamiento de flexiones:** reconocimiento de variantes frecuentes de genero y numero
  en espanol (`bueno` -> `buen`, `buena`, `buenos`, `buenas`; `malo` -> `mala`, `malos`, `malas`)
  y formas irregulares y plurales en ingles (`good` -> `better`, `best`; `bad` -> `worse`, `worst`;
  `crisis` -> `crises`; `happy` -> `happier`, `happiest`), asociando la aparicion al termino
  canonico activo correspondiente.
- **Normalizacion y limites de palabra:** busqueda insensible a mayusculas y tildes mediante
  descomposicion y eliminacion de diacriticos, aplicando fronteras de palabra (`\b`) para
  evitar falsos positivos por subcadenas (p. ej. `ale` no reconoce dentro de `desalentar`).
- **Aislamiento por idioma:** cada noticia se analiza exclusivamente contra los terminos activos
  de su propio idioma (`es` o `en`), ignorando terminos de otro idioma o marcados como inactivos.
- **Seed reproducible e idempotente:** funcion `seed_sentiment_terms()` ejecutada en el
  arranque de la aplicacion que no duplica registros ni sobrescribe modificaciones realizadas
  por administradores sobre terminos preexistentes.

## Pruebas automatizadas

Se ejecutaron las pruebas unitarias del lexico y del reconocimiento bilingue:

```text
pytest tests/test_sentiment_seed.py tests/test_sentiment_engine.py -q
14 passed in 0.20s
```

La suite certifica:

- presencia de exactamente 30 pares de conceptos comparables en espanol e ingles;
- todos los valores contenidos estrictamente en el intervalo `[-10.0, 10.0]` con precision `0.1`;
- reconocimiento correcto de formas flexionadas en espanol y en ingles;
- descarte de coincidencias parciales dentro de palabras mas largas;
- no interferencia entre terminos espanoles e ingleses en noticias de un solo idioma;
- persistencia y asociacion directa al identificador del termino canonico (cubierta por
  `tests/test_news_sentiment_postgresql.py`, ejecutada en la evidencia de E2-H02).

## Comprobacion en PostgreSQL

En una base PostgreSQL 16 limpia (volumen nuevo de Docker Compose), el backend aplico las
migraciones y el seed inicial al arrancar. El seed intercala cada termino espanol con su par
ingles, por lo que los identificadores son reproducibles sobre una base limpia:

```text
humworld=# SELECT idioma, count(*) FROM termino GROUP BY idioma ORDER BY idioma;
 idioma | count
--------+-------
 en     |    30
 es     |    30
(2 rows)

humworld=# SELECT id_termino, palabra, idioma, valor FROM termino WHERE palabra IN ('alegría', 'joy', 'paz', 'peace', 'crisis', 'violencia', 'violence') ORDER BY id_termino;
 id_termino |  palabra  | idioma | valor
------------+-----------+--------+-------
          1 | alegría   | es     |   8.0
          2 | joy       | en     |   8.0
         13 | paz       | es     |   6.0
         14 | peace     | en     |   6.0
         39 | crisis    | es     |  -6.0
         40 | crisis    | en     |  -6.0
         43 | violencia | es     | -10.0
         44 | violence  | en     | -10.0
(8 rows)
```

Para comprobar la idempotencia se ejecuto de nuevo `seed_sentiment_terms()` dentro del
contenedor del backend y se comparo una huella de la tabla antes y despues:

```text
humworld=# SELECT count(*) AS terminos, md5(string_agg(id_termino || palabra || idioma || valor || activo, ',' ORDER BY id_termino)) AS huella FROM termino;
 terminos |              huella
----------+----------------------------------
       60 | 0b27256ba48cdee80ba93b6442ee7e07
(1 row)

docker compose -f opsx/docker-compose.yml exec backend python -c "from app.database import get_session_factory; from app.seeds.sentiment import seed_sentiment_terms
with get_session_factory()() as s: seed_sentiment_terms(s)"

humworld=# SELECT count(*) AS terminos, md5(string_agg(id_termino || palabra || idioma || valor || activo, ',' ORDER BY id_termino)) AS huella FROM termino;
 terminos |              huella
----------+----------------------------------
       60 | 0b27256ba48cdee80ba93b6442ee7e07
(1 row)
```

La segunda ejecucion no agrego filas ni modifico los registros existentes: el conteo y la
huella son identicos.

## OpenSpec y contratos

```text
openspec validate news-sentiment-analysis --strict
Specification 'news-sentiment-analysis' is valid

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```
