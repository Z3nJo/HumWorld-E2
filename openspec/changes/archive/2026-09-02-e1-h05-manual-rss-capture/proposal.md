# E1-H05: Actualización manual de captura para fuentes RSS

## Why

El sistema ya captura noticias automáticamente mediante el cron de E1-H03, pero no ofrece una forma explícita de solicitar una captura inmediata. Esto dificulta validar una fuente recién creada y actualizar noticias bajo demanda.

## What Changes

- Agregar `POST /api/v1/sources/capture` para ejecutar una captura inmediata.
- Permitir capturar todas las fuentes activas o una lista seleccionada mediante `source_ids`.
- Reutilizar el servicio RSS existente, manteniendo deduplicación, normalización y aislamiento de errores.
- Devolver un resumen por fuente y totales de la ejecución.
- Documentar el endpoint en OpenAPI/Swagger y probarlo contra PostgreSQL.

## Non-goals

- No cambiar la periodicidad ni el comportamiento del scheduler.
- No agregar autenticación, historial de ejecuciones ni procesamiento asíncrono.
- No modificar el modelo de noticias ni crear migraciones nuevas.

## Dependencies

- E1-H01: fuentes RSS persistidas y activas.
- E1-H03: servicio de captura, persistencia idempotente y reporte por fuente.

