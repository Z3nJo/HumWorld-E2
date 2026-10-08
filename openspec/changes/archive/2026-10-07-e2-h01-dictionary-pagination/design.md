# Design

## Context

La pantalla del diccionario ya obtiene y filtra los términos en el frontend, y `TermTable` recibe la lista visible completa. La paginación debe integrarse en esa frontera sin cambiar el contrato de la API ni las operaciones CRUD existentes.

## Goals / Non-Goals

**Goals:**

- Presentar grupos de 12 términos con controles consistentes con el prototipo HTML.
- Mantener búsqueda, filtros y operaciones CRUD coherentes con la página visible.
- Evitar que un cambio de resultados deje al usuario en una página inválida.

**Non-Goals:**

- No añadir paginación al endpoint del backend.
- No cambiar el orden alfabético ni la semántica de búsqueda y filtros.
- No modificar el formulario, la edición inline, la eliminación ni el modelo de datos salvo para conservar su compatibilidad con la página actual.

## Decisions

- **Paginación en cliente:** se derivará una lista paginada a partir de `visibleTerms`, porque el hook ya entrega los resultados filtrados y el alcance no requiere cambios en la API. La alternativa de paginación server-side añadiría parámetros, estados de carga y cambios de contrato innecesarios.
- **Tamaño fijo de 12:** se usará una constante única para que la tabla y los controles compartan la misma regla, igual que `PG=12` en el prototipo.
- **Estado local de página en `DictionaryPage`:** la página se reiniciará explícitamente cuando cambien búsqueda o filtro, y se limitará al máximo de páginas cuando cambie el total. Así `TermTable` seguirá siendo un componente de presentación de las filas visibles.
- **Controles en el contenedor de la tabla:** el rango, el indicador de página y los botones vivirán junto a la tabla para conservar el contexto del total y evitar que cada fila conozca la paginación.

## Risks / Trade-offs

- [Los cambios rápidos de búsqueda pueden cambiar el total mientras se renderiza] → Reiniciar la página en cada cambio de criterio y calcular siempre la página actual contra el total visible.
- [Crear o eliminar términos puede invalidar la página actual] → Recalcular el máximo de página después de cada actualización de `visibleTerms` y ajustar la página a un índice válido.
- [Un listado corto puede mostrar controles innecesarios] → Mantener el indicador de página y deshabilitar los botones; opcionalmente ocultar el pie cuando solo exista una página si el diseño existente lo requiere, sin afectar la accesibilidad.

## Migration Plan

No hay migración de datos ni despliegue de API. Se implementa el estado local y el pie de paginación en el frontend, se valida con listados de 0, 1, 12, 13 y múltiples términos, y se revierte eliminando la lógica de paginación si la validación visual o funcional falla.
