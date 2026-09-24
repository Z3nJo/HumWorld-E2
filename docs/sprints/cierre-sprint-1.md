# Cierre del Sprint 1

Periodo: 17 de agosto - 4 de septiembre de 2026.
Fecha de cierre documental: 5 de septiembre de 2026.

## Resultado

El Sprint Goal se cumplio en su totalidad. Las fuentes RSS son gestionables via `/sources`,
los parametros de ejecucion son configurables via `/config` y la captura de noticias opera
tanto por cron como bajo demanda, con deduplicacion verificada contra PostgreSQL.

Se cerraron ademas el objetivo secundario E1-H05 y las dos tareas transversales de calidad,
por lo que el Sprint entrego los 31 puntos comprometidos.

## Alcance entregado

| ID | Puntos | Estado | Integracion | Evidencia |
| --- | ---: | --- | --- | --- |
| E1-H01 | 5 | Completada | PR #6, 2026-08-29 | [`e1-h01-evidencia-validacion.md`](e1-h01-evidencia-validacion.md) |
| E1-H02 | 3 | Completada | PR #7, 2026-08-29 | [`e1-h02-evidencia-validacion.md`](e1-h02-evidencia-validacion.md) |
| E1-H04 | 2 | Completada | PR #8, 2026-08-30 | [`e1-h04-evidencia-validacion.md`](e1-h04-evidencia-validacion.md) |
| E4-H01 | 2 | Completada | PR #9, 2026-08-31 | [`e4-h01-evidencia-validacion.md`](e4-h01-evidencia-validacion.md) |
| E1-H03 | 8 | Completada | PR #11, #12, #13, 2026-09-01 | [`e1-h03-evidencia-validacion.md`](e1-h03-evidencia-validacion.md) |
| E1-H05 | 3 | Completada (objetivo secundario) | PR #14, 2026-09-02 | [`e1-h05-evidencia-validacion.md`](e1-h05-evidencia-validacion.md) |
| QA-S1 | 3 | Completada | Incluida en PR #11-#14 | Suite pytest en CI |
| INT-S1 | 3 | Completada | PR #16, 2026-09-04 | [`int-01-evidencia-validacion.md`](int-01-evidencia-validacion.md) |
| DOC-S1 | 2 | Completada | Este documento | `docs/sprints/`, `opsx/contracts/` |

**Total entregado: 31 de 31 puntos comprometidos.**

E1-H05 estaba planificado como objetivo secundario, con arrastre autorizado al Sprint 2. No
fue necesario ejercerlo.

## Metricas de calidad

Medicion local del 5 de septiembre de 2026, con el comando equivalente al del pipeline:

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
78 passed
Total coverage: 97.01%
```

| Indicador | Valor | Umbral DoD |
| --- | ---: | ---: |
| Pruebas automatizadas | 78 | — |
| Cobertura total | 97,01 % | 80 % |
| Pruebas fallidas u omitidas | 0 | 0 |
| Contratos OpenSpec validados en modo estricto | 5 de 5 | 5 |
| Migraciones reversibles verificadas | 3 de 3 | 3 |

Las pruebas API-BD se ejecutan contra PostgreSQL 16 real, tanto en local como en CI.

## Contratos y documentacion

Los contratos OpenSpec de las capacidades del Sprint estan versionados como fuente editable
en `openspec/specs/` y publicados como copia entregable en `opsx/contracts/`:

| Capacidad | Endpoint | Requisitos |
| --- | --- | ---: |
| `rss-source-management` | `/api/v1/sources` | 9 |
| `runtime-configuration` | `/api/v1/config` | 6 |
| `rss-news-capture` | Cron y `/api/v1/sources/capture` | 9 |
| `integration-verification` | Verificacion vertical API-BD | 4 |

La sincronizacion entre ambas ubicaciones no depende de disciplina manual: el paso
`Validate generated OpenSpec contracts` del pipeline ejecuta `python opsx/sync_contracts.py
--check` y falla la build si la copia entregable se desactualiza.

## Velocidad real y recalibracion

El Sprint 1 es la primera medicion real de velocidad del proyecto y sustituye a la capacidad
teorica usada hasta ahora.

| Concepto | Planificado | Real |
| --- | ---: | ---: |
| Dias del Sprint | 19 | 19 |
| Puntos comprometidos | 31 | 31 |
| Puntos entregados | — | 31 |
| Velocidad observada | — | 31 pts / 19 dias |

**El factor efectivo 0,6 no puede validarse ni descartarse.** Ese factor convierte horas
brutas en horas efectivas, y el equipo no registro horas reales durante el Sprint. La
recalibracion que sigue se expresa por tanto en puntos por Sprint, que es la unica magnitud
efectivamente medida.

Proyeccion de la velocidad observada sobre los Sprints restantes:

| Sprint | Dias | Capacidad segun velocidad observada | Puntos comprometidos | Desviacion |
| --- | ---: | ---: | ---: | ---: |
| Sprint 2 | 19 | 31 | 32 | +3 % |
| Sprint 3 | 19 | 31 | 41 | **+32 %** |
| Sprint 4 | 12 | ~20 | 30 | **+53 %** |

Lecturas:

- **Sprint 2 es viable.** La desviacion cabe dentro del margen de error de una sola medicion.
- **Sprint 3 esta sobrecomprometido en unos 10 puntos.** Con la velocidad observada
  requeriria alrededor de 25 dias en lugar de 19. Es el Sprint con mayor carga de frontend y
  mayor acoplamiento con backend, de modo que el riesgo no se compensa solo con esfuerzo.
- **Sprint 4 esta sobrecomprometido en unos 10 puntos** sobre un Sprint mas corto, y ademas
  es el Sprint de cierre, donde el margen para desplazar alcance es minimo.

Recomendacion para la planificacion del Sprint 2: revisar el alcance de los Sprints 3 y 4
antes de comprometerlo, priorizando por valor y no reduciendo calidad. La opcion natural es
adelantar al Sprint 2 parte del trabajo de preparacion de `E2-H01-UI` y trasladar a Sprint 4
alguna historia de dashboards de menor prioridad.

**Reserva metodologica:** una sola medicion no constituye una tendencia. El Sprint 1 entrego
el 100 % de lo comprometido, incluido un objetivo secundario, lo que puede indicar tanto
velocidad alta como estimaciones conservadoras. La cifra debe reconfirmarse al cierre del
Sprint 2 antes de tratarla como velocidad estable.

## Deuda y observaciones abiertas

| Punto | Detalle | Destino propuesto |
| --- | --- | --- |
| Fuente RSS de CBC inaccesible | `https://www.cbc.ca/cmlink/rss-topstories` falla la descarga de forma sostenida desde E1-H03. El aislamiento de errores funciona y no bloquea al resto, pero el continente America queda sin cobertura efectiva | Reemplazar la fuente en el seed de E1-H02 |
| `docs/openapi/openapi.yaml` desactualizado | El archivo versionado es un esqueleto con `paths: {}`, mientras el contrato real vive en `/api/openapi.json` y publica nueve operaciones | SWG-04 o tarea previa del Sprint 2 |
| Caducidad de noticias sin efecto | `noticias.caducidad_dias` se persiste y valida, pero todavia no purga | E4-H02, ya planificada en Sprint 2 |
| Validacion sobre Docker pendiente para E1-H05 | La evidencia de E1-H05 se levanto sobre PostgreSQL y Python nativos de igual version, no sobre Docker Compose | Adjuntar al PR de la historia |
| Horas reales sin registrar | Impide validar el factor efectivo 0,6 y refinar la capacidad en horas | Acordar registro de horas en el Sprint 2 |

## Estado de la cadena critica

E1-H03 se cerro dentro del Sprint, por lo que el riesgo de bloqueo en cascada sobre E2-H02 y
el Sprint 3 queda desactivado. La dependencia critica pasa ahora a E2-H02, que requiere
ADR-001 aprobado antes de darse por completada.
