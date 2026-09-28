# Cierre del Sprint 2

Periodo: 7 al 25 de septiembre de 2026.
Fecha de cierre documental: 28 de septiembre de 2026 (metricas revalidadas ese dia sobre `main`
en `52349a6`).

## Resultado

El Sprint Goal se cumplio en su totalidad. El motor de analisis de sentimiento se encuentra
plenamente integrado y operativo en espanol e ingles, con soporte para formas flexionadas y un
lexico inicial curado de 30 pares de conceptos. El diccionario de terminos cuenta con CRUD
completo via API bajo `/api/v1/dictionary`, se expuso exitosamente el endpoint sin estado
`POST /api/v1/sentiment` para evaluacion puntual de texto libre, y el purgado automatico de
noticias caducadas opera coordinado con el scheduler segun la retencion configurada.

Se entregaron los 35 puntos de historia comprometidos sin desestimaciones ni arrastres de
tareas planificadas.

## Alcance entregado

| ID | Puntos | Estado | Integracion | Evidencia |
| --- | ---: | --- | --- | --- |
| E2-H01-API | 5 | Completada | PR #20-#23, 2026-09-21 | [`e2-h01-api-evidencia-validacion.md`](e2-h01-api-evidencia-validacion.md) |
| ADR-001 | 3 | Completada | PR #25, 2026-09-24 (acordado el 2026-09-22) | [`ADR-001-algoritmo-calculo-humor.md`](../adr/ADR-001-algoritmo-calculo-humor.md) |
| E2-H02 | 8 | Completada, con C-V9 pendiente | PR #27-#31, 2026-09-25 | [`e2-h02-evidencia-validacion.md`](e2-h02-evidencia-validacion.md) |
| E2-H03 | 5 | Completada | PR #32-#34, 2026-09-25 | [`e2-h03-evidencia-validacion.md`](e2-h03-evidencia-validacion.md) |
| E2-H04 | 3 | Completada | PR #35-#38, 2026-09-25 | [`e2-h04-evidencia-validacion.md`](e2-h04-evidencia-validacion.md) |
| E4-H02 | 3 | Completada | PR #39-#41, 2026-09-25 | [`e4-h02-evidencia-validacion.md`](e4-h02-evidencia-validacion.md) |
| QA-S2 | 3 | Completada | Incluida en PR #20-#41 | Suite pytest en CI |
| INT-S2 | 3 | Completada | PR #23 y #30 (purgado en #40), 2026-09-25 | [`int-02-evidencia-validacion.md`](int-02-evidencia-validacion.md) |
| DOC-S2 | 2 | Completada | Este documento | `docs/sprints/`, `opsx/contracts/` |

**Total entregado: 35 de 35 puntos comprometidos.**

Las fechas corresponden a la fusion del ultimo PR de cada fila. El PR #26 restauro el cierre del
Sprint 1 y archivo los cambios OpenSpec pendientes; no suma puntos al Sprint 2.

## Metricas de calidad

Medicion local del 28 de septiembre de 2026 con el mismo comando del paso `Backend tests` del
pipeline, ejecutado desde `backend/` en un contenedor `python:3.12-slim` contra PostgreSQL 16 de
Docker Compose (detalle en [`int-02-evidencia-validacion.md`](int-02-evidencia-validacion.md)):

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
168 passed, 11 warnings in 11.04s
Total coverage: 97.62%
```

El resultado coincide con el de CI sobre `main` (run 36192420881: `168 passed, 11 warnings`,
`Total coverage: 97.62%`).

| Indicador | Valor | Umbral DoD |
| --- | ---: | ---: |
| Pruebas automatizadas | 168 | — |
| Cobertura total | 97,62 % | 80 % |
| Pruebas fallidas u omitidas | 0 | 0 |
| Especificaciones OpenSpec validadas en modo estricto | 8 de 8 (y 2 cambios activos) | 8 |
| Migraciones reversibles verificadas | 5 de 5 | 5 |

Todas las pruebas de integracion API-BD se ejecutan contra una instancia real de PostgreSQL 16
tanto en el pipeline remoto como en local.

## Contratos y documentacion

Los contratos OpenSpec de las capacidades del Sprint estan versionados como fuente editable en
`openspec/specs/` y publicados como copia sincronizada entregable en `opsx/contracts/`:

| Capacidad | Endpoint / Componente | Requisitos |
| --- | --- | ---: |
| `rss-source-management` | `/api/v1/sources` | 11 |
| `runtime-configuration` | `/api/v1/config` | 7 |
| `rss-news-capture` | Cron y `/api/v1/sources/capture` | 10 |
| `dictionary-management` | `/api/v1/dictionary` | 7 |
| `news-sentiment-analysis` | `/api/v1/sentiment` y analisis de noticias | 6 |
| `news-purging` | Scheduler de purgado automatico | 3 |
| `integration-verification` | Verificacion vertical API-BD | 4 |

La sincronizacion estricta entre ambas ubicaciones esta protegida por el pipeline:
el comando `python opsx/sync_contracts.py --check` valida que ninguna copia difiera de su
especificacion original.

## Velocidad real y recalibracion

Con el cierre del Sprint 2 se cuenta con una segunda medicion empirica de rendimiento del equipo:

| Concepto | Sprint 1 | Sprint 2 | Consolidado / Promedio |
| --- | ---: | ---: | ---: |
| Dias de ejecucion | 19 | 19 | 38 |
| Puntos entregados | 31 | 35 | 66 |
| Velocidad observada | 31 pts / 19 dias (1,63 pts/dia) | 35 pts / 19 dias (1,84 pts/dia) | **~33 pts / 19 dias (1,74 pts/dia)** |

La velocidad media observada asciende a **33 puntos por sprint de 19 dias**, lo que mejora
levemente la estimacion inicial pero confirma las advertencias sobre el volumen de los
siguientes Sprints:

Proyeccion actualizada sobre los Sprints 3 y 4:

| Sprint | Dias | Capacidad recalibrada (~1,74 pts/dia) | Puntos comprometidos | Desviacion |
| --- | ---: | ---: | ---: | ---: |
| Sprint 3 | 19 | 33 | 41 | **+24 %** |
| Sprint 4 | 12 | ~21 | 30 | **+43 %** |

Lecturas y recomendaciones:

- **Sprint 3 sigue sobrecomprometido en ~8 puntos.** Aunque la desviacion bajo del +32 % al
  +24 %, Sprint 3 concentra la construccion de interfaces de usuario (React/Vite), el mapa
  mundial coropleta (`E3-H01`), la nube de palabras (`E3-H02`) y la pantalla del diccionario
  (`E2-H01-UI`). Se recomienda priorizar la visualizacion principal y mantener modulares los
  componentes complementarios para autorizar arrastres ordenados hacia el Sprint 4 si fuera
  necesario.
- **Sprint 4 presenta una sobrecarga critica (+43 %).** Con solo 12 dias naturales de sprint,
  la capacidad proyectada es de unos 21 puntos frente a 30 previstos. El equipo debera
  revisar el backlog de cierre y pulido antes de iniciar dicho sprint.

## Deuda y observaciones abiertas

| Punto | Detalle | Destino propuesto |
| --- | --- | --- |
| Protocolo de validacion con datos reales C-V9 (ADR-001) | La formalizacion teorica de ADR-001 y las pruebas algoritmicas estan completas, pero la validacion de concordancia con 100 noticias reales etiquetadas a mano requiere un diccionario poblado con mas terminos y volumen historico. ADR-001 lo fija como condicion para cerrar `E2-H02` | Ejecutar protocolo V-0 a V-5 en Sprint 3 con corpus poblado |
| Interfaz de usuario del diccionario (`E2-H01-UI`) | La API y base de datos de `/dictionary` quedaron concluidas, pero la vista administrativa frontend fue reservada para evitar dispersar esfuerzo | Implementar en Sprint 3 |
| Cambios OpenSpec sin archivar | `openspec/changes/e2-h02-news-sentiment` y `openspec/changes/e4-h02-news-purging` tienen todas sus tareas marcadas, pero siguen activos (no se movieron a `openspec/changes/archive/`) | Archivar ambos cambios al inicio del Sprint 3 |
| Rango de `TERMINO.valor` en `/dictionary` | La tabla de riesgos de ADR-001 indica que el CRUD de `/dictionary` valida el rango `[-10, 10]`, pero la especificacion `dictionary-management` y los esquemas de `backend/app/api/schemas.py` solo exigen un decimal finito; hoy el rango se rechaza recien en el motor de sentimiento | Alinear ADR-001 o el codigo en Sprint 3 |

La sustitucion de la fuente CBC, registrada como deuda en el cierre del Sprint 1, quedo resuelta
en el PR #19: el seed de `backend/app/seeds/sources.py` usa PBS (ver
[`reemplazo-cbc-pbs-evidencia-validacion.md`](reemplazo-cbc-pbs-evidencia-validacion.md)).

## Estado de la cadena critica

`E2-H02` se cerro en su alcance funcional con la aprobacion de ADR-001 y la confirmacion de la
persistencia de `valor_humor` y `NOTICIA_TERMINO` en PostgreSQL, pero conserva una condicion
de cierre pendiente: ADR-001 (secc. 6, criterio C-V9, y secc. 7) exige ejecutar y publicar el
protocolo de validacion con datos reales V-0 a V-5, diferido al Sprint 3. La persistencia ya
permite construir los endpoints de agregacion regional y los dashboards (`T-DASH-01`, `E3-H01`,
`E3-H02`) en el Sprint 3; si el protocolo no alcanza sus criterios, ADR-001 preve ajustar
`humor.formula_noticia` sin cambiar codigo.
