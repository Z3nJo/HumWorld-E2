## Why

El backend ya expone la captura RSS bajo demanda (`POST /api/v1/sources/capture`, E1-H05) y el purgado manual de noticias caducadas (`DELETE /api/v1/news`, E4-H03), pero el frontend no ofrece ninguna acción para usarlos: hoy solo pueden ejecutarse desde Swagger o con un cliente HTTP. Los criterios de E1-H05 ("la ejecución manual dispara la captura inmediata y confirma el resultado") y de E4-H03 quedan incompletos para el usuario administrador mientras no exista una acción en la interfaz.

## What Changes

- Añadir en `/fuentes` una acción global «Capturar ahora» que ejecuta `POST /api/v1/sources/capture` sin cuerpo para todas las fuentes elegibles.
- Añadir en cada medio de la tabla de `/fuentes` una acción «Capturar» que ejecuta la captura solo de los canales RSS de ese medio mediante `source_ids`.
- Mostrar el resultado de cada captura (noticias insertadas, fuentes fallidas y fuentes omitidas) y comunicar los errores con el tratamiento de errores existente.
- Añadir en la tarjeta «Captura y caducidad» de `/parametros` una acción «Purgar ahora» que, tras una confirmación explícita, ejecuta `DELETE /api/v1/news`.
- Bloquear las acciones mientras se ejecutan para evitar solicitudes duplicadas, y bloquear el purgado mientras existan cambios de parámetros sin guardar.
- Sin cambios en el backend ni en los contratos HTTP.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `frontend/sources-ui`: añade la captura manual global y por medio, con su resumen de resultado.
- `frontend/parameters-ui`: añade el purgado manual de noticias caducadas con confirmación.

## Impact

- Frontend: `features/sources` (cliente API, hook y tabla), `pages/Sources/SourcesPage.tsx`, `features/config` (cliente API y tarjetas) y `pages/Parameters/ParametersPage.tsx`; pruebas Vitest de ambas pantallas.
- API: consume endpoints existentes; no se modifican rutas, esquemas ni OpenAPI.
- Documentación: `docs/uml/UML-01-casos-de-uso.md` deja de describir la captura manual como «solo API; sin pantalla» y registra el purgado manual desde `/parametros`.
- Contratos: sincronizar `opsx/contracts/` tras actualizar las specs principales.
