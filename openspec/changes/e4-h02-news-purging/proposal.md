## Why

`noticias.caducidad_dias` ya se persiste y valida mediante `/config`, pero no tiene efecto sobre las noticias almacenadas. E4-H02 debe materializar esa retención para evitar conservar indefinidamente datos caducados y cumplir la regla R-M3 de MOD-01.

## What Changes

- Incorporar un proceso automático de purgado de noticias basado en la caducidad runtime vigente.
- Eliminar físicamente cada noticia cuya `fecha_registro` sea anterior al instante actual menos `noticias.caducidad_dias`.
- Programar el purgado con APScheduler usando la periodicidad configurada para la captura, sin crear un parámetro ni un endpoint adicionales.
- Reprogramar los trabajos de captura y purgado cuando se actualice la periodicidad de captura, sin ejecutar un purgado inmediato.
- Verificar la regla temporal, la eliminación en cascada de `NOTICIA_TERMINO` y la conservación de noticias vigentes con pruebas unitarias e integración PostgreSQL.

## Capabilities

### New Capabilities

- `news-purging`: eliminación automática y física de noticias caducadas según la configuración runtime.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: nuevo servicio y repositorio de purgado, y extensión del scheduler existente.
- Persistencia: elimina filas de `noticia`; PostgreSQL elimina en cascada sus filas de `noticia_termino` mediante la FK existente.
- Configuración: consume `noticias.caducidad_dias` y `captura.periodicidad_minutos` ya disponibles; no cambia `GET` ni `PUT /api/v1/config`.
- API/OpenAPI: no incorpora endpoints ni contratos HTTP.

## Non-Goals

- Purgado manual, endpoints de borrado o interfaz de administración.
- Nuevos parámetros de configuración o una cadencia independiente para el purgado.
- Cambios a fuentes RSS, captura de contenidos, análisis de sentimiento, diccionario o dashboards.
