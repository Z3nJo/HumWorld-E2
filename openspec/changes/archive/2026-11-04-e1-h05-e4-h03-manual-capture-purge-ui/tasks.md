## 1. Captura manual en `/fuentes`

- [x] 1.1 Añadir `captureSources(sourceIds?)` y sus DTO de respuesta en `features/sources/infrastructure`, enviando `POST /api/v1/sources/capture` sin cuerpo o con `{ source_ids }`; verificar con pruebas que ambos cuerpos se construyen correctamente y que la respuesta se mapea al dominio.
- [x] 1.2 Añadir la acción global «Capturar ahora» en la barra superior de `SourcesPage` con estado «en curso» compartido y toast de resumen (insertadas, fallidas, omitidas); verificar con pruebas de la página el éxito, el estilo de error cuando hay fuentes con `error` y la deshabilitación durante la petición.
- [x] 1.3 Añadir la acción «Capturar» por medio en `SourceTable`, enviando solo los canales RSS activos y deshabilitada para medios inactivos o sin canales activos; verificar con pruebas el `source_ids` enviado y el estado deshabilitado.
- [x] 1.4 Cubrir el fallo de la captura (`400`, `404`, `500` y error de red) con toast de error, conservando la tabla y los filtros; verificar con pruebas de la página.

## 2. Purgado manual en `/parametros`

- [x] 2.1 Añadir `purgeExpiredNews()` en `features/config/infrastructure` con `DELETE /api/v1/news`; verificar con una prueba que acepta el `204` sin cuerpo.
- [x] 2.2 Crear el modal de confirmación de purgado siguiendo el patrón de `DeleteSourceModal` (Escape, `loading`) con el texto que incluye la caducidad cargada; verificar con pruebas que cancelar o cerrar no envía la petición.
- [x] 2.3 Añadir «Purgar ahora» en la tarjeta «Captura y caducidad», deshabilitado con cambios pendientes y durante el purgado, con toast de éxito sin cantidad y toast de error que permite reintentar; verificar todos los escenarios del delta `frontend/parameters-ui` con pruebas de la página.

## 3. Documentación, contratos y verificación

- [x] 3.1 Actualizar `docs/uml/UML-01-casos-de-uso.md`: CU-09 pasa a la ruta `/fuentes` y el purgado manual (E4-H03) figura con la ruta `/parametros`.
- [x] 3.2 Sincronizar los deltas con `openspec/specs/frontend/sources-ui` y `openspec/specs/frontend/parameters-ui`, ejecutar `python opsx/sync_contracts.py` y verificar con `--check`.
- [x] 3.3 Ejecutar `pnpm run lint`, `pnpm test` y `pnpm run build` en `frontend/`, y `openspec validate e1-h05-e4-h03-manual-capture-purge-ui --strict`; verificar que todo pasa.
