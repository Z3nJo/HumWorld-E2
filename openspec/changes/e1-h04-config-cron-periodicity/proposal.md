## Why

HumWorld necesita persistir y recuperar la periodicidad del cron de captura antes de implementar la captura automatica de E1-H03. MOD-01 ya define `CONFIGURACION` como parametros globales expuestos por `GET`/`PUT /config`, y E1-H04 es el punto minimo para materializar esa decision sin adelantar la captura, el purgado ni la interfaz administrativa.

## What Changes

- Agregar el contrato backend de `GET /api/v1/config` y `PUT /api/v1/config`.
- Persistir el parametro `captura.periodicidad_minutos` en una tabla `configuracion` de tipo clave-valor.
- Devolver y actualizar el valor configurable de periodicidad del cron, con valor por defecto documentado de `60` minutos.
- Validar que la periodicidad sea un entero positivo antes de persistirla.
- Inicializar o recuperar el parametro por defecto cuando la base migrada aun no tenga el registro.
- Cubrir el flujo con pruebas unitarias de servicio y pruebas de integracion API contra PostgreSQL.
- Documentar el endpoint, el valor por defecto y la forma de verificacion.

## Capabilities

### New Capabilities

- `runtime-configuration`: Gestion persistente de parametros globales mediante `/config`, iniciando con `captura.periodicidad_minutos`.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: nuevo endpoint `/api/v1/config`, schemas Pydantic, servicio, repositorio y modelo de configuracion.
- Persistencia: nueva migracion Alembic para la tabla `configuracion`.
- API/OpenAPI: Swagger publicara `GET` y `PUT /api/v1/config` con respuestas JSON y codigos estandar.
- Pruebas: nuevas pruebas unitarias e integracion API <-> BD para persistencia, lectura, actualizacion y validaciones.
- Documentacion: instrucciones de uso y evidencia de validacion para E1-H04.

## Non-Goals

- No implementar APScheduler ni el cron real de captura.
- No capturar noticias ni leer RSS.
- No agregar parametros de caducidad de noticias; eso queda para E4-H01.
- No crear UI de administracion; eso queda para E4-H04.
- No modificar `/sources`, seeds, diccionario, sentimiento ni dashboards.
