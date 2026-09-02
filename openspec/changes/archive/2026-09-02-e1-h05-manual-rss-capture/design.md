# Diseño técnico

## Endpoint

Se añadirá `POST /api/v1/sources/capture`. Un cuerpo ausente o `{}` captura todas las fuentes activas. Un cuerpo con `source_ids` captura solo las fuentes activas cuyos identificadores se indiquen.

Los identificadores inexistentes se rechazarán antes de iniciar la captura con `404` (o `400` si la validación del payload falla). Las fuentes existentes pero inactivas se omitirán y quedarán reflejadas en el reporte.

## Reutilización

El endpoint invocará `NewsCaptureService` y no duplicará la lógica de descarga, normalización, deduplicación ni actualización de `fecha_ultima_captura`. El servicio incorporará una selección opcional de fuentes, conservando `capture_active_sources()` para el cron.

## Respuesta

La respuesta incluirá reportes por fuente (`source_id`, `inserted`, `duplicates`, `invalid`, `error`) y totales (`inserted`, `failed_sources`). La operación será síncrona: responderá cuando termine el recorrido seleccionado.

## Concurrencia y errores

Una ejecución manual puede coincidir con el cron; la restricción única `(id_fuente, guid_origen)` mantiene la idempotencia. No se agregará un bloqueo global en esta historia. Los errores se aíslan por fuente y no interrumpen las restantes.

