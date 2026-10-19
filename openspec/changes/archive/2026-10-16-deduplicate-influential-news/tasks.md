## 1. Decisión y trazabilidad

- [x] 1.1 Revisar ADR-002, sección 8.3, para sustituir la constancia de no reproducción por la evidencia del caso controlado con dos filas de la misma URL y reabrir issue #68.
- [x] 1.2 Añadir al historial de ADR-002 una revisión que formalice la deduplicación por URL exacta, la conservación de la captura más antigua y el desempate por identificador.

## 2. Ranking deduplicado

- [x] 2.1 Modificar `DashboardRepository.influential_news` para seleccionar una representante por URL después de los filtros existentes y antes del orden de influencia y `LIMIT 10`.
- [x] 2.2 Conservar el contrato HTTP actual, sus parámetros, los campos de cada noticia y la separación API-servicio-repositorio.

## 3. Pruebas

- [x] 3.1 Añadir una prueba de integración PostgreSQL con dos fuentes y la misma URL en fechas distintas; verificar una sola respuesta y que es la noticia más antigua.
- [x] 3.2 Cubrir el desempate por `id_noticia`, la aplicación del límite después de deduplicar y la exclusión de una captura más antigua fuera del filtro.
- [x] 3.3 Ejecutar la suite de dashboards pertinente y revisar que las pruebas existentes de orden, filtros y límite continúan pasando.
