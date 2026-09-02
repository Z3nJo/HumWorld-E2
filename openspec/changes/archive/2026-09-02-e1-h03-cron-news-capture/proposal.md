## Why

HumWorld necesita convertir las fuentes RSS ya registradas en noticias persistentes mediante una ejecucion automatica y configurable. E1-H03 encabeza la cadena critica hacia el analisis de sentimiento y debe materializar ahora el modelo `NOTICIA`, el control de duplicados y el cron previsto por MOD-01 y ADR-003.

## What Changes

- Incorporar captura automatica que recorra exclusivamente las fuentes RSS activas con la periodicidad persistida en `captura.periodicidad_minutos`.
- Descargar los feeds RSS con timeout, analizarlos y normalizar sus entradas mediante las tecnologias fijadas en ADR-003.
- Persistir noticias con su fuente, identificador de origen, contenido, idioma, fecha de publicacion opcional y fecha/hora de registro.
- Evitar duplicados por la combinacion unica `(id_fuente, guid_origen)`, usando el `link` del item cuando el feed no entregue `guid`.
- Actualizar `fecha_ultima_captura` despues de procesar correctamente cada fuente, incluso si no aparecen noticias nuevas.
- Aislar los fallos por fuente para que una descarga o entrada invalida no interrumpa el recorrido de las demas fuentes activas.
- Reprogramar en caliente el job de captura despues de actualizar correctamente la periodicidad mediante `PUT /api/v1/config`.
- Incorporar pruebas unitarias sin red real, pruebas de integracion contra PostgreSQL, verificacion de cobertura y evidencia reproducible en Docker.

## Capabilities

### New Capabilities

- `rss-news-capture`: cubre la programacion automatica, lectura de fuentes activas, normalizacion RSS, persistencia de noticias, fechas de captura y control de duplicados.

### Modified Capabilities

- `runtime-configuration`: hace que una actualizacion valida de `captura.periodicidad_minutos` reprograme en caliente el job automatico de captura.

## Impact

- Backend: nuevos modelo, repositorio y servicio de noticias/captura; integracion del scheduler con el ciclo de vida de FastAPI y coordinacion con `/config`.
- Persistencia: nueva migracion Alembic para `noticia`, FK hacia `fuente_rss`, unicidad compuesta e indices previstos por MOD-01.
- Dependencias: incorpora `feedparser` y `APScheduler`, ya seleccionados por ADR-003; reutiliza `httpx` para descargas con timeout.
- API/OpenAPI: no crea endpoints nuevos; conserva el contrato JSON de `/api/v1/config` y agrega el efecto runtime de reprogramacion.
- Operacion: el scheduler se ejecuta en la unica instancia actual del backend y puede desactivarse explicitamente en pruebas.
- Documentacion: actualiza instrucciones operativas, evidencia de validacion y contratos OpenSpec entregables.

## Non-Goals

- No implementar captura manual ni acciones de actualizacion bajo demanda de E1-H05.
- No exponer listado, detalle o eliminacion de noticias mediante `/news`.
- No analizar sentimiento ni poblar `valor_humor`, `fecha_analisis` o `NOTICIA_TERMINO`.
- No implementar purgado automatico o manual, diccionario, dashboards ni interfaz web.
- No soportar multiples procesos o replicas del backend coordinando un mismo scheduler.
