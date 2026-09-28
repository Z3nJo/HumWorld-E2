# Evidencia de validacion E2-H02

Fecha de revalidacion local: 2026-09-28, sobre `main` en `52349a6` (Docker Compose y
PostgreSQL 16). La historia se integro con los PR #27 a #31; el ultimo se fusiono el 2026-09-25.

## Alcance implementado

Se integro el motor de sentimiento en el ciclo de captura y procesamiento de noticias
(`NewsCaptureService`), aplicando de forma estricta las reglas y formulas definidas en
[ADR-001](../adr/ADR-001-algoritmo-calculo-humor.md):

- Formula por defecto: promedio ponderado normalizado en `[-1, 1]`:
  `Σ(ocurrencias × valor) / (humor.escala_maxima × Σocurrencias)`.
- Precision numerica auditable: `valor_humor` persistido con 3 decimales (`ROUND_HALF_UP`)
  y cada `aporte_humor` en `NOTICIA_TERMINO` con 2 decimales.
- Persistencia transaccional atomica: `valor_humor`, `fecha_analisis` y las filas desglosadas
  en `NOTICIA_TERMINO` (`ocurrencias`, `aporte_humor`) se confirman en una sola transaccion
  por noticia o lote. Ante cualquier fallo en el calculo o insercion de aportes, se realiza
  rollback integral impidiendo estados parciales.
- Tratamiento diferenciado de casos limite:
  - Noticia sin terminos reconocidos: `fecha_analisis` informada, `valor_humor = NULL` y
    cero filas en `NOTICIA_TERMINO`.
  - Noticia con equilibrio exacto entre terminos positivos y negativos: `valor_humor = 0.000`
    conservando las filas desglosadas de los terminos participantes.
- Seleccion y recuperacion de noticias pendientes: identificadas exclusivamente mediante
  `fecha_analisis IS NULL` (regla H-6 de ADR-001), garantizando que las noticias sin terminos
  no se reprocesen indefinidamente y permitiendo liquidar noticias anteriores mediante
  `process_pending_news()`.

## Pruebas unitarias y de dominio

Se ejecuto la suite del motor de sentimiento y del servicio de captura desde `backend/`:

```text
pytest tests/test_sentiment_engine.py tests/test_sentiment_configuration.py tests/test_capture_service.py -q
27 passed in 0.27s
```

La suite valida:

- reconocimiento de terminos en titulo y descripcion sin descargar el cuerpo web;
- aplicacion del promedio ponderado, simple y suma acotada;
- rechazo explicito de terminos con valor fuera de `[-10, 10]` o con precision mayor a un decimal;
- resolucion dinamica de parametros desde la tabla `configuracion`;
- analisis y recuperacion de noticias pendientes por lote sin alterar noticias ya analizadas.

## Integracion con PostgreSQL

Las pruebas verticales API-BD validan la persistencia real del calculo contra PostgreSQL 16
(base `humworld_test` migrada con `alembic upgrade head`):

```text
pytest tests/test_capture_api_postgresql.py tests/test_news_sentiment_postgresql.py tests/test_news_sentiment_migration_postgresql.py -q
18 passed, 5 warnings in 4.70s
```

Comprobaciones ejecutadas sobre PostgreSQL:

- insercion atomica de `noticia` y sus registros relacionados en `noticia_termino`;
- noticias sin terminos reconocidos persistidas con `valor_humor IS NULL` y `fecha_analisis` informada;
- aislamiento de errores: una fuente o termino invalido revierte unicamente su propio ambito sin abortar el procesamiento de fuentes validas;
- verificacion de integridad referencial y claves foraneas entre `noticia` y `termino`.

Estas cifras corresponden solo a los archivos de la historia. Las metricas de la suite completa
del Sprint se registran en [`cierre-sprint-2.md`](cierre-sprint-2.md).

## Validacion en Docker Compose

El entorno contenerizado se levanto sobre un volumen nuevo. El backend aplico las cinco
migraciones y el seed de sentimiento al arrancar; luego se cargo el seed de fuentes y se lanzo
una captura manual:

```text
docker compose -f opsx/docker-compose.yml up --build -d
docker compose -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
Seed de fuentes RSS completado: 6 canales creados, 6 fuentes creadas, 0 fuentes existentes.

curl -s -X POST http://localhost:3000/api/v1/sources/capture -H "Content-Type: application/json" -d '{}'
{"sources":[{"source_id":1,"inserted":50,"duplicates":0,"invalid":0,"error":null},{"source_id":2,"inserted":20,"duplicates":0,"invalid":0,"error":null},{"source_id":3,"inserted":635,"duplicates":19,"invalid":0,"error":null},{"source_id":4,"inserted":19,"duplicates":0,"invalid":0,"error":null},{"source_id":5,"inserted":132,"duplicates":0,"invalid":0,"error":null},{"source_id":6,"inserted":25,"duplicates":0,"invalid":0,"error":null}],"skipped_source_ids":[],"inserted":881,"failed_sources":0}
```

La captura inserto 881 noticias, todas analizadas (`fecha_analisis` informada): 141 con
`valor_humor` y 740 sin terminos reconocidos. Las noticias provienen de los feeds RSS en vivo
del 2026-09-28, por lo que titulos e identificadores cambian en cada ejecucion. La base de datos
confirmo la asignacion de sentimiento y el desglose de terminos:

```text
humworld=# SELECT id_noticia, left(titulo, 60) AS titulo, idioma, valor_humor, fecha_analisis FROM noticia WHERE id_noticia IN (19, 63) ORDER BY id_noticia;
 id_noticia |                            titulo                            | idioma | valor_humor |        fecha_analisis
------------+--------------------------------------------------------------+--------+-------------+-------------------------------
         19 | Ethiopians celebrate Meskel and call for peace amid renewed  | en     |      -0.233 | 2026-09-28 14:39:24.508214+00
         63 | 5 men arrested near UK air base used by U.S. in Iran war on  | en     |      -0.500 | 2026-09-28 14:39:25.029242+00
(2 rows)

humworld=# SELECT nt.id_noticia, nt.id_termino, t.palabra, t.valor, nt.ocurrencias, nt.aporte_humor FROM noticia_termino nt JOIN termino t USING (id_termino) WHERE nt.id_noticia IN (19, 63) ORDER BY nt.id_noticia, nt.id_termino;
 id_noticia | id_termino |  palabra  | valor | ocurrencias | aporte_humor
------------+------------+-----------+-------+-------------+--------------
         19 |         14 | peace     |   6.0 |           1 |         6.00
         19 |         34 | fear      |  -7.0 |           1 |        -7.00
         19 |         58 | conflict  |  -6.0 |           1 |        -6.00
         63 |         30 | agreement |   3.0 |           1 |         3.00
         63 |         42 | war       |  -9.0 |           2 |       -18.00
(5 rows)
```

Con escala maxima 10 (`humor.escala_maxima` en `configuracion`):

- Noticia 19: `(6.0 - 7.0 - 6.0) / (10 × 3) = -7.0 / 30 = -0.233`.
- Noticia 63: `(3.0 - 18.0) / (10 × 3) = -15.0 / 30 = -0.500`; `war` aparece dos veces y pondera doble.

Los valores calculados coinciden exactamente con los persistidos.

## OpenSpec y contratos

```text
openspec validate e2-h02-news-sentiment --strict
Change 'e2-h02-news-sentiment' is valid

openspec validate news-sentiment-analysis --strict
Specification 'news-sentiment-analysis' is valid

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```
