## 1. Caso de uso compartido

- [ ] 1.1 Extraer en la capa de servicios la orquestación que obtiene `noticias.caducidad_dias` vigente y ejecuta `NewsPurgeService`, devolviendo la cantidad eliminada; verificar con pruebas unitarias que consulta la configuración en cada llamada, delega el valor resuelto y propaga los fallos.
- [ ] 1.2 Adaptar `run_purge_job()` para usar la operación compartida sin cambiar su aislamiento de sesión, rollback, retorno ni logs; verificar que las pruebas del scheduler cubren tanto la ejecución correcta como el error y que no se duplica la regla de purgado.

## 2. Endpoint de purgado manual

- [ ] 2.1 Crear y registrar el router de noticias bajo `/api/v1/news`, con una dependencia que construya el caso de uso compartido usando la sesión de `get_db`; verificar mediante pruebas API que `DELETE /api/v1/news` invoca una vez el servicio y no requiere body ni parámetros.
- [ ] 2.2 Implementar la respuesta `204 No Content` con cuerpo vacío tanto cuando se eliminan filas como cuando el resultado es cero; verificar ambos casos y una segunda solicitud idempotente con pruebas del endpoint.
- [ ] 2.3 Mantener el manejo transaccional y el formato de error estándar ante una falla del purgado; verificar mediante una dependencia falsa que el endpoint responde `500` y no convierte el error en una respuesta exitosa.
- [ ] 2.4 Documentar la operación en OpenAPI con resumen, respuesta `204` y error `500`; verificar programáticamente que `/api/v1/news` publica solo el método `DELETE` esperado, no declara `422` y usa los contratos de respuesta del proyecto.

## 3. Integración con PostgreSQL

- [ ] 3.1 Añadir una prueba API–PostgreSQL con noticias caducadas, vigentes y exactamente en el umbral; verificar que `DELETE /api/v1/news` usa la caducidad persistida vigente, responde `204` y elimina únicamente las filas estrictamente anteriores.
- [ ] 3.2 Asociar una noticia caducada con `NOTICIA_TERMINO` en la prueba de integración; verificar la cascada y la conservación de fuentes, canales, términos, configuración y noticias no caducadas.
- [ ] 3.3 Cubrir una ejecución repetida y un escenario de fallo transaccional; verificar que la repetición mantiene `204` sin cambios adicionales y que el fallo produce rollback sin eliminación parcial.

## 4. Contratos y verificación final

- [ ] 4.1 Ejecutar las suites unitarias de purgado, scheduler y API, además de la integración PostgreSQL pertinente; verificar que no existen regresiones en el purgado automático ni fallos en las pruebas modificadas.
- [ ] 4.2 Sincronizar el delta `news-purging` con la especificación principal y regenerar `opsx/contracts/news-purging/spec.md`; verificar que el sincronizador de contratos pasa también en modo `--check`.
- [ ] 4.3 Ejecutar `openspec validate e4-h03-manual-news-purging --strict` y las verificaciones de OpenAPI; confirmar que todos los artefactos y el contrato HTTP cumplen el criterio de finalización de E4-H03.
