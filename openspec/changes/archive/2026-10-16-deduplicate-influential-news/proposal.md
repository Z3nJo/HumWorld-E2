## Why

La unicidad de captura de `NOTICIA` es `(id_fuente, guid_origen)`, por lo que dos fuentes pueden persistir la misma URL. Una prueba controlada el 16 de octubre de 2026 creó dos noticias de fuentes distintas con la URL `https://example.test/noticia-duplicada-prueba`, `valor_humor = -1.000` y fechas de registro `2026-10-10` y `2026-10-12`.

`GET /api/v1/dashboards/noticias-influyentes` devolvió ambas filas en el top 10, con la más reciente primero por su desempate actual. El artículo duplicado ocupó dos posiciones, contradiciendo la expectativa de que el listado represente artículos distintos. Esta evidencia invalida el cierre como no reproducido registrado previamente para issue #68.

## What Changes

- Deduplicar las noticias candidatas del ranking por URL exacta dentro del filtro aplicado.
- Conservar como representante de cada URL la noticia con `fecha_registro` más antigua; si las fechas son iguales, conservar la de menor `id_noticia`.
- Aplicar el orden de influencia y el límite de 10 después de la deduplicación.
- Revisar ADR-002 para reabrir el seguimiento #68, registrar la reproducción controlada y formalizar la regla de deduplicación.
- Añadir una prueba de integración PostgreSQL que demuestre que dos fuentes con la misma URL generan una sola respuesta y que la representante es la más antigua.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `influential-news-ranking`: listado de noticias influyentes con una representante determinista por URL.

## Impact

- Backend: consulta `DashboardRepository.influential_news`.
- Documentación: revisión de ADR-002 e issue #68.
- Pruebas: cobertura de integración PostgreSQL del ranking deduplicado.
- No cambia la unicidad de captura, el esquema, las migraciones, los parámetros ni la forma de respuesta de la API.
