## Why

El modelo persistente ya contempla la geografia, el sitio web y el estado de cada canal, pero `/api/v1/sources` no permite registrar ni consultar esos datos y no existe un contrato para administrar el medio padre. Esta brecha impide completar la interfaz de fuentes y deja sin una via soportada para poblar el pais que consumen los dashboards.

## What Changes

- Incorporar `GET /api/v1/channels`, `GET /api/v1/channels/{channel_id}`, `PUT`, `PATCH` y `DELETE` para consultar, reemplazar, actualizar parcialmente y desactivar logicamente canales.
- Mantener la creacion atomica de canales y fuentes en `POST /api/v1/sources`, ampliando los datos del canal con `pais`, `url_sitio` y `activo`.
- Completar las representaciones de canal y fuente con los campos persistidos de lectura, incluidas sus fechas de alta y la ultima captura de la fuente.
- Ampliar el listado de fuentes con filtros por canal y pais, conservando los filtros y rutas existentes.
- Hacer que la captura automatica y manual procese una fuente solamente cuando tanto la fuente como su canal esten activos.
- Documentar y probar los contratos nuevos y modificados mediante OpenAPI, pruebas unitarias y pruebas de integracion contra PostgreSQL.
- Mantener fuera de alcance la eliminacion fisica de canales, la reasignacion de fuentes, un catalogo completo ISO, la carga automatica de paises en el seed y los cambios de frontend o dashboard.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `rss-source-management`: ampliar los datos observables de canales y fuentes, incorporar la administracion REST de canales y nuevos filtros de consulta sin romper las rutas de fuentes existentes.
- `rss-news-capture`: exigir que el canal asociado este activo tanto en recorridos completos como en capturas manuales seleccionadas.

## Impact

- **API:** nuevos endpoints `/api/v1/channels` y ampliacion compatible de los esquemas y filtros de `/api/v1/sources`.
- **Backend:** cambios coordinados en adaptadores FastAPI, servicios y repositorios de fuentes, canales y captura; los modelos y columnas existentes se reutilizan sin migracion de esquema.
- **Datos:** actualizar `continente` o `pais` de un canal reclasifica sus noticias historicas en consultas geograficas porque la ubicacion se resuelve mediante la relacion noticia-fuente-canal.
- **Consumidores:** el frontend podra editar, desactivar y reactivar el medio padre en una sola operacion, y consultar los metadatos que hoy aparecen bloqueados.
- **Compatibilidad:** `POST /sources` conserva su alta agregada, las fuentes conservan su canal durante `PUT` y `PATCH`, y `DELETE /channels/{id}` preserva fuentes y noticias mediante desactivacion logica.
