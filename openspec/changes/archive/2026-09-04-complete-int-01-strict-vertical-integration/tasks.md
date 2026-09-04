## 1. Preparacion de pruebas verticales backend

- [x] 1.1 Revisar las pruebas existentes de configuracion, captura, fixtures PostgreSQL y dependencias FastAPI para reutilizar el patron actual.
- [x] 1.2 Definir un doble de feed RSS controlado que reemplace solo la lectura externa del feed, manteniendo servicio, repositorio y PostgreSQL reales.
- [x] 1.3 Preparar fixtures de base migrada y limpia para `canal`, `fuente_rss`, `noticia` y `configuracion` con `RESTART IDENTITY CASCADE`.

## 2. Integracion API-BD de captura

- [x] 2.1 Agregar una prueba de integracion que cree una fuente activa en PostgreSQL y ejecute `POST /api/v1/sources/capture` desde `TestClient`.
- [x] 2.2 Verificar que la respuesta HTTP incluye resultado por fuente, totales de insertadas, duplicados, invalidas y fallos.
- [x] 2.3 Consultar PostgreSQL despues de la llamada y verificar noticia persistida, idioma heredado, `guid_origen`, `fecha_registro` y `fecha_ultima_captura`.
- [x] 2.4 Ejecutar una segunda captura con el mismo feed controlado y verificar deduplicacion en respuesta y en la restriccion `(id_fuente, guid_origen)`.
- [x] 2.5 Verificar que una fuente inexistente solicitada por `source_ids` responde `404` sin crear noticias parciales.

## 3. Integracion API-BD de configuracion

- [x] 3.1 Confirmar que las pruebas existentes de `GET /api/v1/config` sobre base limpia siguen verificando defaults contra PostgreSQL.
- [x] 3.2 Confirmar que `PUT /api/v1/config` persiste ambos parametros y que un segundo `GET` recupera los valores desde PostgreSQL.
- [x] 3.3 Confirmar que payloads invalidos responden `400` y no modifican los valores persistidos previamente.
- [x] 3.4 Ajustar o ampliar las pruebas si algun escenario de la spec `integration-verification` queda sin cobertura.

## 4. Frontend-API y condicion de activacion

- [x] 4.1 Documentar que Frontend-API queda pendiente de una superficie React/Vite real porque `frontend/` aun no contiene `package.json` ni vistas consumidoras.
- [x] 4.2 Agregar una tarea futura trazable para activar pruebas Frontend-API cuando exista una vista de configuracion o captura manual.
- [x] 4.3 Verificar que el frontend no declare consumo de endpoints no publicados en OpenAPI antes de implementar esas pruebas.

## 5. CI, documentacion y evidencia

- [x] 5.1 Ejecutar localmente la suite backend completa contra PostgreSQL migrado con cobertura.
- [x] 5.2 Confirmar que `.github/workflows/ci.yml` ejecuta migraciones y pruebas de integracion backend contra PostgreSQL.
- [x] 5.3 Sincronizar contratos OpenSpec hacia `opsx/contracts` y validar `python opsx/sync_contracts.py --check`.
- [x] 5.4 Registrar evidencia de INT-01/INT-S1 en `docs/sprints/` o en el PR con comandos ejecutados, resultado de CI y escenarios cubiertos.
- [x] 5.5 Verificar el run remoto de CI en verde antes de marcar la tarea como completada.
