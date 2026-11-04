# Cierre del Sprint 4

Periodo: 19 al 30 de octubre de 2026 (tablero de Jira "HUM Sprint 4").
Fecha de cierre documental: 4 de noviembre de 2026. Métricas tomadas del pipeline de CI sobre
`main` en `4651311` (run 41840104787, 4 de noviembre de 2026). El sprint se cierra en este
documento; el cierre en Jira queda a cargo del equipo.

## Resultado

El Sprint 4 cerró la funcionalidad comprometida y la estabilización previa a la entrega. Se
completó el listado de noticias influyentes (`E3-H02`), el purgado manual de noticias por API e
interfaz (`E4-H03`), las pruebas de integración finales (`QA-01`), el cierre de cobertura
(`QA-02`), la revisión de calidad (`SNQ-04`), la revisión de Swagger/OpenAPI (`SWG-04`), la
integración frontend-backend (`INT-01`) y la documentación final consolidada (`DOC-04`).

Se entregaron **22 de los 30 puntos** comprometidos. `FIX-01` (5 puntos) y `DEMO-01` (3
puntos) se postergan por decisión del equipo: corresponden a la corrección de defectos y a la
preparación de la demostración, que se ejecutan después de este cierre. El repositorio no
contiene un documento de planificación del Sprint 4; el alcance de referencia es el tablero.

## Alcance entregado

| ID | Jira | Puntos | Estado | Integración | Evidencia |
| --- | --- | ---: | --- | --- | --- |
| E3-H02 | HUM-42 | 5 | Completada | PR #70, #83, #84 y #89, 2026-10-27 a 2026-10-30 | [`e3-h02-evidencia-validacion.md`](e3-h02-evidencia-validacion.md); `GET /api/v1/dashboards/noticias-influyentes` |
| E4-H03 | HUM-43 | 2 | Completada | PR #73 y #74 (API), 2026-10-26; PR #91 (interfaz), 2026-10-30 | `DELETE /api/v1/news`; pantalla `/parametros` |
| INT-01 | HUM-44 | — | Completada | Sin PR que cite el ID; Jira la resuelve el 2026-10-31 | Pruebas de integración de `QA-01` (PR #99) |
| SNQ-04 | HUM-45 | — | Completada | PR #93 y #94 (citan `SNQ-04`); PR #95-#97 del mismo lote, 2026-10-30 | Credenciales PostgreSQL fuera del repositorio ([guía](../operations/postgresql-credentials.md)); rutas del catálogo geográfico restringidas; `pnpm/action-setup` fijado por commit |
| QA-01 | HUM-46 | 5 | Completada | PR #99, 2026-10-31 | Pruebas de integración finales y correcciones de CI |
| QA-02 | HUM-47 | 3 | Completada | PR #100, 2026-10-31 | Cobertura backend 97,30 % (umbral 80 %) |
| SWG-04 | HUM-48 | 2 | Completada | Sin PR que cite el ID; Jira la resuelve el 2026-10-30 | Contrato exportado en [`docs/openapi/openapi.yaml`](../openapi/openapi.yaml) (PR #106) |
| DOC-04 | HUM-49 | 5 | Completada | PR #106, 2026-11-04, y este documento | README, [`UML-02`](../uml/UML-02-diagrama-componentes.md) en notación UML, contratos en `opsx/contracts/`, `ADR-004` aceptado |

**Total entregado: 22 de 30 puntos comprometidos.** `INT-01` y `SNQ-04` no tienen
estimación en Jira.

### Postergado

| ID | Jira | Puntos | Motivo |
| --- | --- | ---: | --- |
| FIX-01 | HUM-50 | 5 | Corrección de defectos detectados en integración y pruebas; se ejecuta después del cierre |
| DEMO-01 | HUM-51 | 3 | Preparación y ensayo de la demostración; se ejecuta después del cierre |

Las fechas de integración corresponden a la fusión del último PR de cada fila. `E4-H03`,
`INT-01`, `QA-01` y `QA-02` se resolvieron el 31 de octubre y `DOC-04` el 4 de noviembre, después
del fin del sprint en Jira (30 de octubre).

### Trabajo integrado fuera del alcance comprometido

| Trabajo | PR | Observación |
| --- | --- | --- |
| Atribución geográfica por país mencionado (`NOTICIA_PAIS`, catálogo local, backfill) | #75-#82, #86-#88 y #92, 2026-10-27 a 2026-10-30 | Sin ID de backlog (series `geo-01` a `geo-11`); specs `news-geographic-attribution` y `dashboard-aggregation` actualizadas |
| Rediseño de la landing con globo de partículas y migración a pnpm | #72, 2026-10-26 | Sin ID de backlog |
| Catálogo inicial de sentimiento ampliado a 8000 términos | #98, 2026-10-30 | Sin ID de backlog; cambio OpenSpec `expand-sentiment-seed-catalog` activo |
| Captura manual desde la pantalla de fuentes (`E1-H05`, interfaz) | #90, 2026-10-30 | Historia del Sprint 1; se agrega su interfaz |
| Mejoras del dashboard: agregado global, países desde la API y animación del mapa (`E3-H01`) | #101-#103 y #105, 2026-11-03 | Historia del Sprint 3; integradas después del congelamiento |
| Claridad del alta de fuentes (`E1-H01`) | #104, 2026-11-03 | Historia del Sprint 1; integrada después del congelamiento |

No suman puntos al Sprint 4.

## Métricas de calidad

Resultado del pipeline de CI sobre `main` en `4651311` (run 41840104787, 4 de noviembre de
2026). No se hizo una revalidación local para este cierre.

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
347 passed, 1 skipped, 11 warnings in 29.60s
Total coverage: 97.30%

pnpm test
Test Files  27 passed (27)
     Tests  213 passed (213)
```

| Indicador | Valor | Umbral DoD |
| --- | ---: | ---: |
| Pruebas backend (pytest) | 347 (242 al cierre del Sprint 3) | — |
| Pruebas frontend (Vitest) | 213 en 27 ficheros (136 al cierre del Sprint 3) | — |
| Cobertura total backend | 97,30 % | 80 % |
| Pruebas fallidas | 0 | 0 |
| Pruebas omitidas | 1 (backend) | 0 |
| Migraciones Alembic | 6 (1 nueva: esquema geográfico, PR #78) | — |
| Análisis SonarCloud del último PR (#106) | Superado | Sin incidencias críticas ni bloqueantes |

La validación estricta de especificaciones OpenSpec no se revalidó para este cierre.

## Contratos y documentación

| Capacidad | Endpoint / Componente | Ubicación |
| --- | --- | --- |
| `dashboard-aggregation` | `/api/v1/dashboards` y sus cuatro subrutas | `openspec/specs/` y `opsx/contracts/` |
| `news-geographic-attribution` | Atribución por país en captura y backfill | `openspec/specs/` y `opsx/contracts/` |
| `news-purging` | Trabajo `news-purging` y `DELETE /api/v1/news` | `openspec/specs/` y `opsx/contracts/` |
| Capacidades frontend (`app-shell`, `dictionary-ui`, `dictionary-ui-pagination`, `frontend-runtime`, `parameters-ui`, `sources-ui`) | Pantallas React | `openspec/specs/frontend/` y `opsx/contracts/frontend/` |

Desde el PR #106, `opsx/sync_contracts.py` publica en `opsx/contracts/` las 16
especificaciones de `openspec/specs/` (antes, 7) y CI verifica que estén sincronizadas.

Documentación publicada en el sprint:

- [`ADR-004`](../adr/ADR-004-arquitectura-interna-frontend.md): pasa a estado **Aceptado**.
- [`UML-02`](../uml/UML-02-diagrama-componentes.md): rehecho como diagrama de componentes UML 2 en PlantUML, con SVG exportado.
- [`docs/openapi/openapi.yaml`](../openapi/openapi.yaml): exportado desde la aplicación (15 rutas).
- [`docs/operations/postgresql-credentials.md`](../operations/postgresql-credentials.md): generación y rotación de credenciales.
- [`e3-h02-evidencia-validacion.md`](e3-h02-evidencia-validacion.md): evidencia de `E3-H02`.
- `README.md`: stack, API, despliegue y estado actualizados.

## Velocidad real

| Concepto | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Consolidado |
| --- | ---: | ---: | ---: | ---: | ---: |
| Días de ejecución | 19 | 19 | 19 | 12 | 69 |
| Puntos comprometidos | 31 | 35 | 41 | 30 | 137 |
| Puntos entregados | 31 | 35 | 41 | 22 | 129 |
| Velocidad observada | 1,63 pts/día | 1,84 pts/día | 2,16 pts/día | 1,83 pts/día | **1,87 pts/día** |

El cierre del Sprint 3 proyectó una capacidad de ~23 puntos para el Sprint 4 frente a 30
comprometidos (+33 %). El sprint entregó 22: la proyección acertó y los 8 puntos de diferencia
son exactamente `FIX-01` y `DEMO-01`. Al ser el último sprint, no hay recalibración para un
sprint siguiente.

## Estado de la deuda del Sprint 3

| Punto | Estado | Detalle |
| --- | --- | --- |
| Contratos de `/dashboards` | Cerrado | `T-DASH-01` archivado (2026-10-27); `dashboard-aggregation` publicado en `opsx/contracts/` y `openapi.yaml` regenerado (PR #106) |
| `E3-H02` sin cierre formal | Cerrado | Issues #67 y #68 cerrados, PR #70 fusionado, Jira en Done y evidencia publicada |
| ADR-004 en estado Propuesto | Cerrado | Aceptado por el equipo |
| Enlace `/operaciones` sin ruta | Cerrado | `AppShell.tsx` ya no lo enlaza |
| Cambios OpenSpec sin archivar | Parcial | `e4-h02-news-purging` archivado (PR #73); `e2-h02-news-sentiment` sigue activo |
| Prueba sobre SQLite | Abierto y ampliado | Seis ficheros de `backend/tests/` crean motores SQLite en memoria (`test_dashboard_evolution.py`, `test_dashboard_geographic_repository.py`, `test_geographic_seed.py`, `test_channel_geographic_reconciliation.py`, `test_source_seed.py`, `test_sentiment_analysis_service.py`) |
| Protocolo C-V9 de ADR-001 | Abierto | Sin evidencia en el repositorio de la ejecución V-0 a V-5 con 100 noticias reales |
| Rango de `TERMINO.valor` | Abierto | `schemas.py` no valida `[-10, 10]` y no hay restricción en la base de datos |

## Verificación de la DoD de Release

Sección 4 de la [Definition of Done](../definition-of-done.md).

| # | Criterio | Estado | Evidencia |
| ---: | --- | --- | --- |
| 1 | Cobertura ≥ 80 % en captura, análisis y purgado | Cumple | 97,30 % total en CI; `QA-02` |
| 2 | Sin incidencias críticas ni bloqueantes | Cumple | SonarCloud superado en el PR #106; `SNQ-04` |
| 3 | OpenAPI cubre los endpoints mínimos | Cumple | `/sources`, `/news`, `/dictionary`, `/config`, `/sentiment` y `/dashboards` en `openapi.yaml` |
| 4 | Diagramas UML publicados | Cumple | [`UML-01`](../uml/UML-01-casos-de-uso.md), [`MOD-01`](../uml/MOD-01-modelo-er-inicial.md), [`UML-02`](../uml/UML-02-diagrama-componentes.md) |
| 5 | Todos los ADR con estado resuelto | Cumple | `ADR-000` a `ADR-004` aceptados |
| 6 | README verificado por otra persona en máquina limpia | Sin evidencia | No hay registro en el repositorio |
| 7 | Ficheros de contexto, prompts de IA y contratos OpenSpec en el repositorio | Parcial | Contratos y `.agents/skills/` versionados; no hay registro de prompts y los ficheros de contexto locales (`CLAUDE.md`, `.atl/`) no están versionados |
| 8 | Entregable `EQUIPO_HUMWORLD.tgz` | Sin evidencia | Se arma fuera del repositorio |
| 9 | Acceso del profesor al repositorio | No verificable | El repositorio tiene cinco colaboradores; no consta cuál corresponde al profesor |
| 10 | Todo cerrado antes del 30 de octubre | No cumple | Cinco ítems (`E4-H03`, `INT-01`, `QA-01`, `QA-02` y `DOC-04`) se resolvieron entre el 31 de octubre y el 4 de noviembre, y los PR #101-#106 se integraron después del congelamiento |

## Deuda y observaciones abiertas

| Punto | Detalle | Destino propuesto |
| --- | --- | --- |
| `FIX-01` y `DEMO-01` | Postergados del Sprint 4 | Ejecutar antes de la demostración |
| Puntos 6 a 9 de la DoD de Release | Verificación del README en máquina limpia, registro de prompts y ficheros de contexto, entregable `.tgz` y acceso del profesor | Completar dentro de `FIX-01` y `DEMO-01` |
| Pruebas sobre SQLite | Seis ficheros contradicen la regla de usar solo PostgreSQL 16 | `FIX-01` |
| Cambios OpenSpec activos | Diez cambios en `openspec/changes/` sin archivar, entre ellos `e2-h02-news-sentiment`, `e3-h02-influential-news-list` y `e4-h03-manual-news-purging` | Archivar por sus responsables |
| Protocolo C-V9 y rango de `TERMINO.valor` | Arrastre del Sprint 2 | Alinear `ADR-001` o el código |
| Prueba omitida en backend | CI reporta `1 skipped` | Identificar el motivo (`pytest -rs`) |
| Dependencias sin uso | `chart.js` y `d3-cloud` figuran en `frontend/package.json` y no se importan | Quitarlas |
| Retrospectiva | No está registrada en el repositorio (DoD de Sprint, punto 7) | Registrar en la retrospectiva final |
