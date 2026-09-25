## 1. Catálogo y reconciliación

- [x] 1.1 Sustituir el registro CBC por PBS NewsHour Headlines en `SOURCE_SEEDS`, conservando América, `society`, `en` y `active=True`; verificar con la prueba unitaria del catálogo que hay seis URLs/nombres únicos y una fuente por continente.
- [x] 1.2 Implementar la detección del alias CBC y la actualización transaccional en sitio hacia PBS, preservando `id_canal`, `id_fuente` y relaciones existentes; verificar con una prueba PostgreSQL que las noticias conservan su `id_fuente`.
- [x] 1.3 Definir el comportamiento ante PBS preexistente o conflicto de unicidad; verificar que la operación falla de forma explícita y revierte todos los cambios.

## 2. Pruebas de persistencia e idempotencia

- [x] 2.1 Actualizar la prueba de seed sobre base limpia para esperar PBS y seis registros; verificar que la primera ejecución crea seis canales/fuentes.
- [x] 2.2 Añadir prueba de transición CBC→PBS sobre PostgreSQL y verificar que la segunda ejecución no crea registros adicionales y mantiene una única fuente de América.
- [x] 2.3 Ejecutar la suite existente de seed unitario y PostgreSQL, verificando idempotencia, restricciones de URL/nombre y rollback ante conflictos.

## 3. Validación operativa y documentación

- [x] 3.1 Ejecutar la validación manual del feed PBS con el cliente actual dentro de Docker; verificar HTTP 200, RSS válido y al menos una entrada utilizable, registrando fecha y resultado sin hacer depender CI de la red.
- [x] 3.2 Actualizar la documentación/evidencia del cierre del sprint para retirar CBC y describir PBS como fuente de América; verificar que no quedan referencias activas a la URL CBC fuera de notas históricas.
- [x] 3.3 Ejecutar `openspec validate replace-cbc-rss-source --strict` y las pruebas relevantes; verificar que el cambio queda listo para `$openspec-apply-change`.
