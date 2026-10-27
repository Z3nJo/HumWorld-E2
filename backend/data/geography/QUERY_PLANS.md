# Planes de consultas geográficas

Medición local del 27-10-2026 sobre PostgreSQL 16, con 5.000 noticias y asociaciones de país. Ambas consultas filtraron `CL` y el mismo tramo selectivo de identificadores mediante `EXPLAIN (ANALYZE, FORMAT JSON)`:

| Variante | Tiempo de ejecución | Evidencia del plan |
|---|---:|---|
| `NOTICIA_PAIS` | 0,057 ms | `ix_noticia_pais_codigo_noticia` |
| navegación histórica `NOTICIA → FUENTE_RSS → CANAL` | 0,391 ms | joins de procedencia |

En este conjunto la relación normalizada no produjo regresión; fue más rápida para el filtro selectivo. La prueba `test_country_lookup_plan_uses_geographic_index` exige el índice y un límite conservador de 100 ms, además de impedir una degradación mayor a cinco veces el plan histórico más 1 ms. La materialización de agregados sigue fuera de alcance hasta que una medición de producción la justifique.
