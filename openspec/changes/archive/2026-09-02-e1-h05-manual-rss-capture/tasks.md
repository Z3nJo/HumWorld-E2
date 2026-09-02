# Tareas de implementación

- [x] 1.1 Extender el servicio de captura para aceptar una selección opcional de fuentes sin duplicar la lógica usada por el cron.
- [x] 1.2 Añadir consulta/repositorio para resolver fuentes solicitadas y distinguir inexistentes de inactivas.
- [x] 2.1 Crear schemas Pydantic para el payload opcional y el reporte por fuente/totales.
- [x] 2.2 Implementar `POST /api/v1/sources/capture` con respuestas `200`, `400`, `404` y `500` documentadas.
- [x] 2.3 Mantener errores aislados y reportar fuentes inactivas como omitidas.
- [x] 3.1 Agregar pruebas unitarias para captura total, selección, inactivas, IDs inexistentes, duplicados y fallos aislados.
- [x] 3.2 Agregar pruebas de integración PostgreSQL/API para persistencia y respuesta del endpoint.
- [x] 4.1 Verificar OpenAPI/Swagger y sincronizar contratos OpenSpec.
- [x] 4.2 Actualizar README/evidencia de sprint y ejecutar suite completa con Docker Compose.
