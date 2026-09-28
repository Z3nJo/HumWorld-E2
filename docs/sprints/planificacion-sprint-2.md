# Sprint 2

Periodo: 7 al 25 de septiembre de 2026 (19 dias).

## Sprint Goal

Disponer del motor de analisis de sentimiento operativo en espanol e ingles, gestion del diccionario de terminos por API, endpoint de analisis puntual, calculo y persistencia del humor por noticia en base de datos, y purgado automatico de noticias caducadas.

## Entregables

- CRUD de `/dictionary` operativo y documentado en Swagger (`/api/docs`).
- ADR-001 aprobado formalizando el algoritmo de calculo del humor, la escala `[-1, 1]` y la agregacion regional.
- Calculo y persistencia del valor de humor en noticias capturadas con desglose en `NOTICIA_TERMINO`.
- Soporte bilingue (espanol e ingles) con lexico inicial curado (30 pares de conceptos) y tratamiento de formas flexionadas.
- Endpoint `POST /api/v1/sentiment` para analisis de texto puntual sin persistencia.
- Purgado automatico y periodico de noticias caducadas segun parametro de configuracion.
- Pruebas unitarias y de integracion API-BD en CI superando el umbral de cobertura (meta >90 %).
- Contratos OpenSpec de `dictionary-management`, `news-sentiment-analysis` y `news-purging` sincronizados en `opsx/contracts/`.

## Capacidad planificada

| Concepto | Valor |
| --- | ---: |
| Dias planificados | 19 |
| Capacidad bruta | 152 h-persona |
| Factor efectivo provisional | ~0,68 |
| Capacidad efectiva | ~103 h-persona |
| Puntos comprometidos | 35 |

Los dias planificados incluyen fines de semana. La capacidad del Sprint se recalibra tomando como referencia la velocidad real observada en el Sprint 1 (31 puntos entregados sobre 31 comprometidos). El incremento a 35 puntos incorpora la formalizacion de ADR-001 (3 pts) y la separacion de la vertical backend de diccionario (E2-H01-API, 5 pts), reservando la interfaz de usuario (E2-H01-UI) para el Sprint 3.

## Tareas

| ID | Tarea | Responsable | Puntos | Depende de | Criterio de finalizacion |
| --- | --- | --- | ---: | --- | --- |
| E2-H01-API | CRUD de `/dictionary` en backend, modelos, migraciones y contratos Swagger sin autenticacion | Jose Romero | 5 | ADR-000, MOD-01 | `/dictionary` probado y documentado en Swagger |
| ADR-001 | Algoritmo de calculo del humor: promedio ponderado en `[-1, 1]` y agregacion regional | Matias Santos | 3 | ADR-000, ADR-003, MOD-01 | ADR aprobado antes de dar por completada E2-H02; documenta formula, rango y justificacion |
| E2-H02 | Calculo y persistencia del valor de humor por noticia y desglose de terminos en BD | Jose Romero | 8 | E1-H03, ADR-001, E2-H01-API | Noticias analizadas conservan `valor_humor` en [-1, 1], fecha de analisis y filas en `NOTICIA_TERMINO` |
| E2-H03 | Soporte bilingue (ES/EN) con lematizacion/flexiones y lexico curado reproducible | Jose Romero | 5 | E2-H02 | Terminos y flexiones en ES y EN reconocidos correctamente con lexico reproducible de 30 pares |
| E2-H04 | Endpoint `POST /sentiment` para analisis puntual de texto sin persistencia | Jose Romero | 3 | E2-H02, ADR-001 | Endpoint `/sentiment` operativo y documentado en Swagger con codigos 200, 400 y 500 |
| E4-H02 | Purgado automatico de noticias caducadas segun parametro configurable | Jose Romero | 3 | E4-H01, E1-H03 | Job periodico en scheduler que elimina noticias caducadas y sus relaciones en cascada |
| QA-S2 | Pruebas unitarias de motor de sentimiento, flexiones, diccionario y purgado | David Cortez | 3 | E2-H01-API, E2-H02, E4-H02 | Pruebas automatizadas en CI con cobertura >80 % (meta >90 %) |
| INT-S2 | Pruebas de integracion API-BD para diccionario, sentimiento y purgado | David Cortez | 3 | E2-H01-API, E2-H02, E2-H04, E4-H02 | Escenario vertical verificado contra PostgreSQL 16 y ejecutado en el pipeline CI |
| DOC-S2 | Documentacion del Sprint 2, ADR-001 y contratos de `/dictionary` y `/sentiment` | Matias Santos | 2 | E2-H01-API, ADR-001, E2-H02, E4-H02 | Historias documentadas en `/docs`, contratos versionados en `/opsx` sincronizados |

## Alcance excluido

El Sprint no incorpora la interfaz de usuario del diccionario (`E2-H01-UI`), los dashboards interactivos (`E3-H01`, `E3-H02`, `E3-H03`), autenticacion ni la ejecucion del protocolo de validacion masiva con datos reales C-V9 de ADR-001, el cual queda diferido al Sprint 3 una vez que el diccionario y el corpus cuenten con mayor volumen.

## Riesgos vigentes

- **Dependencia critica de ADR-001:** E2-H02 requiere la formula formalmente aprobada antes de consolidar el calculo de sentimiento. Mitigacion: aprobacion temprana de ADR-001 el 22 de septiembre de 2026.
- **Complejidad del reconocimiento bilingue y flexiones:** el reconocimiento en espanol e ingles podria inducir sobrecostos de procesamiento. Mitigacion: normalizacion estricta con expresiones regulares de limites de palabra y mapeo acotado de variantes flexivas canonicas.
- **Sobrecarga de puntos (35 pts vs 31 pts en S1):** mitigacion trasladando `E2-H01-UI` al Sprint 3 para concentrar el esfuerzo del equipo en la solidez del motor backend y la base de datos.

## Seguimiento

El resultado del Sprint, sus metricas reales y la recalibracion de velocidad se registran en [`cierre-sprint-2.md`](cierre-sprint-2.md). La evidencia de validacion por historia se publica en este mismo directorio como `<historia>-evidencia-validacion.md`.
