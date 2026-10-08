# Design

## Context

El frontend ya dispone de un selector superior de idioma dentro del formulario del diccionario y de filtros de estado para la tabla. La implementación debe usar ese selector como fuente del idioma visible, sin agregar un segundo bloque de controles.

## Goals / Non-Goals

**Goals:**

- Usar el selector superior `Idioma` con `Español` e `Inglés` para filtrar la tabla.
- Combinar idioma, estado y búsqueda antes de ordenar y paginar.
- Conservar el espaciado que tenía `Solo activos` entre `Término`, `Idioma` y `Valor`.
- Mantener el orden alfabético y reiniciar la página al cambiar un filtro.

**Non-Goals:**

- Crear un bloque adicional de filtros de idioma.
- Añadir una opción `Todos los idiomas`.
- Cambiar endpoints, modelos, backend, límite de 12 filas o diseño general del shell.

## Decisions

1. **Selector superior como filtro.** El selector `Idioma` existente notificará el idioma seleccionado a la vista. La misma selección seguirá definiendo el idioma usado al crear el término, evitando duplicar controles y manteniendo el diseño actual.

2. **Filtrado local combinado.** El hook aplicará el idioma seleccionado junto con estado y búsqueda sobre la colección cargada. No se harán solicitudes adicionales ni cambios de API.

3. **Layout original como referencia.** Se conservará el layout automático de la tabla, sus paddings y los anchos originales de las columnas de idioma y valor. No se usará `table-layout: fixed`, `colgroup` ni anchos nuevos que alteren la separación de `Solo activos`.

4. **Pruebas de regresión.** Las pruebas verificarán el selector superior, el filtrado combinado y que cambiar idioma/estado no modifica la estructura ni el espaciado base de la tabla.

## Risks / Trade-offs

- [Risk] El selector de idioma sirve tanto para crear como para filtrar → Mitigation: mantener un único valor controlado y documentar su comportamiento en las pruebas.
- [Risk] No existe una vista de todos los idiomas → Mitigation: conservar el alcance solicitado de solo `Español` e `Inglés` y no añadir un tercer estado visual.
- [Risk] El layout automático puede responder al contenido → Mitigation: conservar los estilos y anchos originales de `Solo activos` sin introducir reglas nuevas de distribución.

## Migration Plan

1. Eliminar el bloque adicional de filtro de idioma.
2. Conectar el selector superior al filtrado de la tabla.
3. Restaurar y verificar el layout original.
4. Ejecutar pruebas, lint y build del frontend.
5. Archivar el cambio después de sincronizar las specs.
