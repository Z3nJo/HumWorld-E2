## Why

El purgado por caducidad ya se ejecuta automáticamente, pero el sistema no ofrece la acción bajo demanda exigida por E4-H03. Se necesita exponer esa misma regla mediante la API para que un usuario pueda solicitar el borrado manual sin esperar al siguiente ciclo del scheduler.

## What Changes

- Incorporar `DELETE /api/v1/news` como acción manual de purgado, sin cuerpo ni parámetros de consulta.
- Resolver en cada solicitud el valor vigente de `noticias.caducidad_dias` y eliminar físicamente las noticias estrictamente anteriores al umbral calculado en UTC.
- Responder `204 No Content` tanto si se eliminan noticias como si no existen registros caducados, manteniendo una operación idempotente.
- Reutilizar el mismo caso de uso de purgado empleado por el proceso automático, con commit o rollback transaccional y sin duplicar reglas en la capa API.
- Publicar la operación y sus respuestas en OpenAPI y verificarla mediante pruebas unitarias e integración API–PostgreSQL.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `news-purging`: añade la ejecución manual del purgado por caducidad mediante `DELETE /api/v1/news`, conservando las reglas temporales y de integridad del proceso automático.

## Impact

- API: nuevo router u operación bajo `/api/v1/news`, disponible sin autenticación como el resto de las operaciones administrativas actuales.
- Servicios: orquestación compartida para que la API y el scheduler resuelvan la configuración vigente y ejecuten el mismo purgado.
- Persistencia: reutiliza `NewsPurgeRepository`; no requiere migraciones ni cambia el modelo de datos.
- Contratos: amplía `news-purging` y el documento OpenAPI con la nueva operación y respuestas `204` y `500`.
- Pruebas: añade cobertura del endpoint, del caso sin resultados, del umbral estricto, de la cascada y del rollback, sin cambios en el frontend.
