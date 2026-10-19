# Cierre del Sprint 3

Periodo: 28 de septiembre al 16 de octubre de 2026.
Fecha de cierre documental: 19 de octubre de 2026 (metricas tomadas del pipeline de CI sobre
`main` en `bc43219`, ultimo commit del Sprint).

## Resultado

El Sprint entrego la primera interfaz de usuario completa de HumWorld sobre React/Vite. El
diccionario de terminos se administra desde la pantalla `/dictionary`, las fuentes RSS, los
canales y los parametros generales desde el panel de administracion (`/fuentes` y
`/parametros`), y el dashboard `/dashboard` muestra el mapa mundial con humor por continente y
pais, la evolucion diaria con selector de dia y la nube de terminos influyentes filtrable por
continente y pais. Todo el dashboard se alimenta de los endpoints agregados de
`/api/v1/dashboards` (`T-DASH-01`). ADR-002 fijo el criterio de "noticia influyente".

Se entregaron los 41 puntos de historia registrados en el tablero de Jira "HUM Sprint 3". El
repositorio no contiene un documento de planificacion del Sprint 3
(`docs/sprints/planificacion-sprint-3.md`); el alcance de referencia es el tablero.

## Alcance entregado

| ID | Puntos | Estado | Integracion | Evidencia |
| --- | ---: | --- | --- | --- |
| E2-H01-UI | 5 | Completada | PR #43-#46, 2026-10-08 | `frontend/src/pages/Dictionary/`, `openspec/changes/archive/2026-10-07-e2-h01-dictionary-ui/` |
| T-DASH-01 | 8 | Completada, con cambio OpenSpec sin archivar | PR #51, #52, #54 y #55, 2026-10-11 (ampliado en PR #66) | `backend/app/api/dashboards.py`, `openspec/changes/t-dash-01-dashboard-aggregates/` |
| E3-H01 | 5 | Completada | PR #66, 2026-10-16 | `DashboardMap.tsx`, `DashboardTimeline.tsx` en `frontend/src/features/dashboard/presentation/` |
| E3-H03 | 5 | Completada | PR #66, 2026-10-16 | `DashboardWordCloud.tsx`, `GET /api/v1/dashboards/nube-palabras` |
| E4-H04 | 5 | Completada | PR #58 y #59, 2026-10-14 | `frontend/src/pages/Sources/`, `frontend/src/pages/Parameters/` |
| ADR-002 | 2 | Completada | PR #69, 2026-10-16 (aceptado el 2026-10-19) | [`ADR-002-criterio-noticia-influyente.md`](../adr/ADR-002-criterio-noticia-influyente.md) |
| QA-S3 | 3 | Completada | Incluida en PR #52, #54 y #66 | `test_dashboard_service.py`, `test_dashboard_api.py`, `test_dashboard_evolution.py`; pruebas Vitest de `features/dashboard/` |
| INT-S3 | 5 | Completada | PR #55, #58, #59 y #66 | `test_dashboards_postgresql.py`; `DashboardPage.test.tsx`, `SourcesPage.test.tsx`, `ParametersPage.test.tsx` |
| DOC-S3 | 3 | Completada | Este documento | [`UML-01-casos-de-uso.md`](../uml/UML-01-casos-de-uso.md), [`UML-02-diagrama-componentes.md`](../uml/UML-02-diagrama-componentes.md) |

**Total entregado: 41 de 41 puntos comprometidos.**

Las fechas corresponden a la fusion del ultimo PR de cada fila. El PR #66 completo ademas
`T-DASH-01` con tres endpoints que no figuran en su contrato OpenSpec (`/dashboards/geografia`,
`/dashboards/evolucion` y `/dashboards/noticias-influyentes`; ver deuda). Las pruebas de
pagina de `INT-S3` usan un cliente HTTP simulado con Vitest: verifican el contrato que el
frontend espera de la API, pero no ejecutan el frontend contra un backend real.

### Trabajo integrado fuera del alcance comprometido

| Trabajo | PR | Observacion |
| --- | --- | --- |
| ADR-004, arquitectura interna del frontend | #47, 2026-10-08 | Rama nombrada como Sprint 2; ADR en estado **Propuesto** |
| Landing publica en `/` | #48-#50, #56, #57 y #65, 2026-10-09 a 2026-10-11 | Sin ID de backlog; usa datos de ejemplo, no consume la API |
| Gestion de canales (`/api/v1/channels`) y su integracion con fuentes y captura | #60-#64, 2026-10-11 | Sin ID de backlog; cambio archivado en `openspec/changes/archive/2026-10-10-extend-channel-source-management/` |
| Endpoint y listado de noticias influyentes (`E3-H02`) | #66, 2026-10-16 | Ver la seccion siguiente |

No suman puntos al Sprint 3.

## Estado de E3-H02

`E3-H02` (listado de noticias influyentes) no formaba parte del Sprint 3: estaba bloqueada por
ADR-002. Aun asi, el PR #66 (commit `f35c3a9`) integro en `main` el endpoint
`GET /api/v1/dashboards/noticias-influyentes`, la consulta
`DashboardRepository.influential_news` y la seccion "Noticias mas influyentes" de
`DashboardPage.tsx`. La implementacion se adelanto a la aprobacion del ADR. ADR-002 la
ratifica (secc. 8, punto 1) y no exige cambios de codigo.

Quedan abiertos antes de dar `E3-H02` por terminada:

- Issue #67: pruebas de desempate y limite de 10 (criterios C-V2 y C-V3 de ADR-002). La prueba
  `test_ranking_caps_at_ten_and_breaks_ties_by_recency_then_id` de
  `backend/tests/test_dashboard_evolution.py` ya cubre ese orden, pero se ejecuta sobre SQLite
  en memoria y no contra PostgreSQL.
- Issue #68: posible noticia duplicada entre fuentes. El PR #70 (deduplicacion por URL) sigue
  abierto a la fecha de este documento.

## Metricas de calidad

Resultado del pipeline de CI sobre `main` en `bc43219` (run 38946929677, 16 de octubre de
2026). No se hizo una revalidacion local para este cierre.

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
242 passed, 11 warnings in 10.52s
Total coverage: 97.82%

npm test
Test Files  19 passed (19)
     Tests  136 passed (136)
```

| Indicador | Valor | Umbral DoD |
| --- | ---: | ---: |
| Pruebas backend (pytest) | 242 (168 al cierre del Sprint 2) | — |
| Pruebas frontend (Vitest) | 136 en 19 ficheros | — |
| Cobertura total backend | 97,82 % | 80 % |
| Pruebas fallidas u omitidas | 0 | 0 |
| Migraciones Alembic | 5 (sin migraciones nuevas en el Sprint) | — |

La validacion estricta de especificaciones OpenSpec no se revalido para este cierre.

## Contratos y documentacion

| Capacidad | Endpoint / Componente | Ubicacion |
| --- | --- | --- |
| `dashboard-aggregation` | `/api/v1/dashboards` y `/api/v1/dashboards/nube-palabras` | `openspec/changes/t-dash-01-dashboard-aggregates/` (cambio activo, no publicado en `opsx/contracts/`) |
| `rss-source-management` | `/api/v1/sources` y `/api/v1/channels` | `openspec/specs/` y `opsx/contracts/` |
| Capacidades frontend (`app-shell`, `dictionary-ui`, `dictionary-ui-pagination`, `frontend-runtime`, `parameters-ui`, `sources-ui`) | Pantallas React | `openspec/specs/frontend/` |

Documentacion publicada en el Sprint:

- [`ADR-002`](../adr/ADR-002-criterio-noticia-influyente.md): criterio de noticia influyente.
- [`UML-01`](../uml/UML-01-casos-de-uso.md): diagrama de casos de uso.
- [`UML-02`](../uml/UML-02-diagrama-componentes.md): diagrama de componentes.

Con estos dos diagramas y [`MOD-01`](../uml/MOD-01-modelo-er-inicial.md), `docs/uml/` contiene
los tres diagramas que exige la DoD de Release (punto 4).

## Velocidad real y recalibracion

| Concepto | Sprint 1 | Sprint 2 | Sprint 3 | Consolidado / Promedio |
| --- | ---: | ---: | ---: | ---: |
| Dias de ejecucion | 19 | 19 | 19 | 57 |
| Puntos entregados | 31 | 35 | 41 | 107 |
| Velocidad observada | 1,63 pts/dia | 1,84 pts/dia | 2,16 pts/dia | **~36 pts / 19 dias (1,88 pts/dia)** |

El Sprint 3 entrego los 41 puntos pese a la desviacion de +24 % prevista en el cierre del
Sprint 2. La entrega se concentro al final: los PR de `E3-H01` y `E3-H03` se fusionaron el
ultimo dia del Sprint.

Proyeccion sobre el Sprint 4:

| Sprint | Dias | Capacidad recalibrada (~1,88 pts/dia) | Puntos comprometidos | Desviacion |
| --- | ---: | ---: | ---: | ---: |
| Sprint 4 | 12 | ~23 | 30 | **+33 %** |

El Sprint 4 sigue sobrecomprometido en unos 7 puntos y termina en el congelamiento interno del
30 de octubre. Conviene cerrar primero `E3-H02` y la deuda de contratos antes de abrir alcance
nuevo.

## Deuda y observaciones abiertas

| Punto | Detalle | Destino propuesto |
| --- | --- | --- |
| Contratos de `/dashboards` | `geografia`, `evolucion` y `noticias-influyentes` (PR #66) no figuran en `openspec/changes/t-dash-01-dashboard-aggregates/specs/dashboard-aggregation/spec.md`. `T-DASH-01` no esta archivado, por lo que `opsx/contracts/` no publica ninguna capacidad de dashboards, y `docs/openapi/openapi.yaml` no incluye `/dashboards` | Completar la especificacion, archivar el cambio y sincronizar contratos al inicio del Sprint 4 |
| Prueba sobre SQLite | `backend/tests/test_dashboard_evolution.py` crea una base SQLite en memoria. Contradice la regla del proyecto de usar solo PostgreSQL 16, tambien en pruebas | Migrar esas pruebas a `test_dashboards_postgresql.py` (cierra tambien el issue #67) |
| `E3-H02` sin cierre formal | Implementada en el PR #66 fuera del Sprint; issues #67 y #68 abiertos, PR #70 pendiente | Cerrar en el Sprint 4 |
| Cambios OpenSpec sin archivar (arrastre del Sprint 2) | `openspec/changes/e2-h02-news-sentiment` y `openspec/changes/e4-h02-news-purging` siguen activos | Archivar en el Sprint 4 |
| Protocolo C-V9 de ADR-001 (arrastre del Sprint 2) | No hay evidencia en el repositorio de que se ejecutara el protocolo V-0 a V-5 con 100 noticias reales | Ejecutar y publicar en el Sprint 4 |
| Rango de `TERMINO.valor` en `/dictionary` (arrastre del Sprint 2) | No se encontro validacion del rango `[-10, 10]` en `backend/app/api/schemas.py` ni en `backend/app/services/dictionary.py` | Alinear ADR-001 o el codigo |
| Enlace sin ruta en el menu | `AppShell.tsx` enlaza `/operaciones`, que no existe en `App.tsx` y redirige a `/dictionary` | Quitar el enlace o implementar la pantalla |
| ADR-004 en estado Propuesto | La DoD de Release exige todos los ADR con estado resuelto | Revisar y aceptar o rechazar en el Sprint 4 |

La deuda del Sprint 2 sobre la interfaz del diccionario (`E2-H01-UI`) quedo resuelta en los
PR #43-#46.
