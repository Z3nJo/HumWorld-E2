## Why

HumWorld necesita exponer el parametro de caducidad de noticias antes de implementar el purgado de informacion antigua. E1-H04 ya creo `/api/v1/config`, la tabla clave-valor `configuracion` y la capability `runtime-configuration`, por lo que E4-H01 debe extender ese contrato existente sin crear otro endpoint ni cambiar el modelo estructural.

## What Changes

- Extender `GET /api/v1/config` para devolver `noticias_caducidad_dias`.
- Extender `PUT /api/v1/config` para persistir `noticias.caducidad_dias` junto con la periodicidad existente.
- Definir valor por defecto documentado de `30` dias, alineado con MOD-01.
- Validar que la caducidad sea un entero positivo antes de persistirla.
- Mantener la compatibilidad del campo existente `captura_periodicidad_minutos`.
- Cubrir el flujo con pruebas unitarias de servicio, pruebas de integracion API contra PostgreSQL y verificacion de OpenAPI.
- Actualizar documentacion backend, evidencia del sprint y contrato entregable sincronizado.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `runtime-configuration`: agrega gestion persistente de `noticias.caducidad_dias` mediante `/config`.

## Impact

- Backend: extension de schemas, servicio y pruebas de configuracion.
- Persistencia: inserta o actualiza una nueva clave en la tabla existente `configuracion`; no requiere migracion de esquema.
- API/OpenAPI: mantiene `GET` y `PUT /api/v1/config`, ampliando el cuerpo JSON.
- Documentacion: actualiza README, evidencia y contratos OpenSpec.

## Non-Goals

- No implementar purgado automatico ni manual de noticias.
- No crear modelo, tabla ni endpoints de noticias.
- No implementar scheduler, jobs ni auditoria de purgado.
- No crear UI de configuracion.
- No modificar fuentes RSS, captura, sentimiento, diccionario ni dashboards.
