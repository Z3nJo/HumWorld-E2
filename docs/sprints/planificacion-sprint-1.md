# Sprint 1

Periodo: 17 de agosto - 4 de septiembre de 2026.

## Sprint Goal

Disponer de fuentes RSS gestionables, parametros de configuracion operativos y captura
automatica de noticias almacenadas en base de datos.

## Entregables

- CRUD de `/sources` operativo y documentado en Swagger.
- Carga inicial de fuentes por continente mediante seed reproducible.
- `/config` con periodicidad de captura y caducidad de noticias persistidas.
- Cron de captura funcionando sin duplicados.
- Pruebas unitarias del modulo de captura ejecutandose en el pipeline.
- Pruebas de integracion API-BD para captura y configuracion.
- Contratos OpenSpec de `/sources` y `/config` versionados en `opsx/contracts/`.

## Capacidad planificada

| Concepto | Valor |
| --- | ---: |
| Dias planificados | 19 |
| Capacidad bruta | 152 h-persona |
| Factor efectivo provisional | 0,6 |
| Capacidad efectiva | ~91 h-persona |
| Puntos comprometidos | 31 |

Los dias planificados incluyen fines de semana, por decision del equipo. El factor 0,6 es un
supuesto de planificacion y se recalibra al cierre de este Sprint, que constituye la primera
medicion real de velocidad del proyecto.

## Tareas

| ID | Tarea | Responsable | Puntos | Depende de | Criterio de finalizacion |
| --- | --- | --- | ---: | --- | --- |
| E1-H01 | Alta de canales y fuentes RSS con categoria IPTC de primer nivel | Jose Romero | 5 | ADR-000, MOD-01 | `/sources` CRUD probado y documentado en Swagger |
| E1-H02 | Carga inicial de fuentes RSS por continente (seed reproducible) | Jose Romero | 3 | E1-H01 | Seed versionado ejecutado sobre base limpia con al menos una fuente por continente |
| E1-H04 | Parametro de periodicidad del cron gestionado via `/config` | Jose Romero | 2 | MOD-01 | Valor configurable persistido y recuperado via `GET`/`PUT /config` |
| E4-H01 | Parametro de caducidad de noticias gestionado via `/config` | Jose Romero | 2 | MOD-01 | Valor configurable persistido y recuperado via `/config` |
| E1-H03 | Captura automatica de noticias mediante cron | Jose Romero | 8 | E1-H01, E1-H04 | El cron recorre las fuentes activas con la periodicidad configurada, registra fecha/hora y no duplica noticias |
| E1-H05 | Actualizacion manual de captura para una o varias fuentes RSS | Jose Romero | 3 | E1-H01 | Ejecucion manual dispara la captura inmediata y confirma el resultado. Objetivo secundario del Sprint |
| QA-S1 | Pruebas unitarias del modulo de captura | David Cortez | 3 | E1-H01, E1-H03 | Pruebas automatizadas ejecutandose en el pipeline y en verde |
| INT-S1 | Pruebas de integracion API-BD para captura y configuracion | David Cortez | 3 | E1-H03, E1-H04, E4-H01 | Escenario de integracion verificado y ejecutado en CI |
| DOC-S1 | Documentacion de las historias del Sprint y contratos OpenSpec de `/sources` y `/config` | Matias Santos | 2 | E1-H01, E1-H04, E4-H01 | Historias documentadas en `/docs` y contratos versionados en `/opsx` |

## Alcance excluido

El Sprint no incorpora calculo de humor, diccionario de terminos, endpoints `/news`,
purgado de noticias, dashboards ni autenticacion. La caducidad de noticias se limita a
persistir el parametro; su aplicacion efectiva corresponde a E4-H02.

## Riesgos vigentes

- **Retraso de E1-H03:** bloquea E2-H02 y, en cascada, el Sprint 3. Mitigacion: priorizar
  E1-H01 y E1-H04 al inicio del Sprint.
- **Capacidad sobrestimada:** el factor 0,6 no esta validado con datos reales. Mitigacion:
  medir velocidad al cierre y recalibrar antes de planificar el Sprint 2.
- **E1-H05 como objetivo secundario:** puede desplazarse al Sprint 2 sin afectar la cadena
  critica.

## Seguimiento

El resultado del Sprint, sus metricas reales y la recalibracion de velocidad se registran en
[`cierre-sprint-1.md`](cierre-sprint-1.md). La evidencia de validacion por historia se
publica en este mismo directorio como `<historia>-evidencia-validacion.md`.
