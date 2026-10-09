## Why

Las vistas del Sprint 3 necesitan consultar el humor agregado y los términos que más influyen dentro de un periodo y un ámbito geográfico sin reproducir reglas de negocio en el frontend. T-DASH-01 debe publicar esos contratos antes de que las vistas consumidoras puedan integrarse.

## What Changes

- Incorporar `GET /api/v1/dashboards` para consultar el promedio de `valor_humor` y el número de noticias evaluables.
- Exigir un rango formado por `fecha_desde` y `fecha_hasta`, expresado como fechas de calendario inclusivas y aplicado sobre `fecha_registro` con cortes UTC.
- Admitir filtros opcionales por `continente` y `pais`; `pais` solo será válido cuando también se informe `continente`.
- Excluir del promedio y del conteo evaluable las noticias con `valor_humor` nulo, y representar explícitamente los ámbitos sin datos.
- Incorporar `GET /api/v1/dashboards/nube-palabras` con el mismo rango y filtros geográficos para devolver hasta 32 términos ordenados por la suma del valor absoluto de sus aportes de humor.
- Informar para cada término su peso de influencia, aporte acumulado con signo y frecuencia total, calculados desde los aportes persistidos en `NOTICIA_TERMINO`.
- Publicar ambos contratos y sus errores de validación en OpenAPI.
- Añadir pruebas unitarias y de integración en PostgreSQL para agregación, filtros, límites temporales, valores nulos, ausencia de datos, cálculo y orden de términos influyentes, y solicitudes inválidas.

## Capabilities

### New Capabilities

- `dashboard-aggregation`: consultas REST del humor agregado y de los términos influyentes por rango de fechas, continente y país.

### Modified Capabilities

Ninguna.

## Impact

- Backend: nuevo adaptador REST, servicio de consulta y acceso agregado a PostgreSQL siguiendo la separación actual entre API, servicios y repositorios.
- Contrato: nuevas operaciones `GET /api/v1/dashboards` y `GET /api/v1/dashboards/nube-palabras`, con sus esquemas de respuesta en OpenAPI.
- Pruebas: casos unitarios del servicio y casos de integración HTTP/PostgreSQL.
- No requiere migraciones, tablas agregadas, dependencias nuevas ni cambios en el frontend, `/sources` o seeds.
