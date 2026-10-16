## Context

La captura preserva la procedencia por fuente mediante la clave única `(id_fuente, guid_origen)`. Esa regla es correcta para la trazabilidad y no debe convertirse en unicidad global por URL. Sin embargo, el ranking de noticias influyentes consume filas de `noticia` directamente, por lo que dos capturas del mismo artículo pueden ocupar varios puestos.

La reproducción controlada confirmó el defecto con dos fuentes de América, la misma URL, el mismo valor de humor extremo y fechas de registro distintas. El endpoint devolvió ambas filas y ordenó primero la más reciente conforme a su orden vigente.

## Decision

El repositorio formará primero el conjunto de noticias evaluables que cumple el rango y los filtros geográficos ya existentes. Dentro de ese conjunto, agrupará por `NOTICIA.url` exacta y conservará una sola representante por URL usando este orden de selección:

```text
fecha_registro ASC,
id_noticia ASC
```

La representante conserva sus campos, incluido su propio `valor_humor`. Después de seleccionar una representante por URL, el ranking aplicará su orden actual:

```text
ABS(valor_humor) DESC,
fecha_registro DESC,
id_noticia ASC
LIMIT 10
```

La deduplicación se ejecuta después de filtrar el ámbito solicitado. Así, una consulta por país solo considera las noticias de ese país; una consulta continental puede deduplicar coincidencias provenientes de fuentes distintas del continente.

## Implementation Approach

Usar una subconsulta o CTE compatible con PostgreSQL que asigne `ROW_NUMBER()` particionado por `url` y ordenado por `fecha_registro ASC, id_noticia ASC`. La consulta exterior conservará solo `row_number = 1` y aplicará la clasificación del ranking. Esta forma evita cargar candidatas en memoria y mantiene los filtros y el límite en PostgreSQL.

La prueba de integración reutilizará los modelos de prueba existentes para crear dos fuentes, dos noticias evaluables con la misma URL y fechas distintas. Verificará que el repositorio y el endpoint devuelven una sola noticia, que su identificador corresponde a la más antigua y que aún se devuelven como máximo diez URLs distintas.

## Alternatives Considered

- Unicidad global de URL durante la captura: descartada porque elimina trazabilidad por fuente y cambia el comportamiento de captura fuera del problema del ranking.
- Conservar la fila más reciente: descartada; la reproducción y la regla solicitada establecen que la primera captura es la representante.
- Deduplicar después de limitar a 10: descartada porque podría devolver menos de diez artículos distintos aun cuando existan más candidatas.
- Normalizar URLs: descartado por ahora; no hay una regla validada para equivalencias como parámetros, redirecciones o mayúsculas, y podría fusionar artículos distintos.

## Risks / Trade-offs

- Dos filas con la misma URL y valores de humor distintos se representan por el valor de la primera captura; es una consecuencia explícita de conservar la más antigua.
- La igualdad es textual y no detecta variantes equivalentes de URL.
- La ventana de filtrado determina qué filas participan; una fila más antigua fuera del rango no desplaza a una candidata dentro del rango.

## Migration Plan

No hay migración. Desplegar la consulta y sus pruebas; para revertir, restaurar la consulta de ranking previa. Las filas de captura no se modifican.
