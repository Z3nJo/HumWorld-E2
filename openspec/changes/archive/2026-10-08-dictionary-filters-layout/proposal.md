# Proposal

## Why

El diccionario frontend debe filtrar correctamente los términos por idioma sin introducir un bloque adicional de controles. Además, la tabla debe conservar en todas las vistas la separación visual que ya tiene `Solo activos` entre `Término`, `Idioma` y `Valor`.

## What Changes

- Mantener el selector superior existente `Idioma` con las opciones `Español` e `Inglés`.
- Hacer que ese selector filtre correctamente la tabla y se combine con `Solo activos`, `Solo inactivos`, `Todos` y la búsqueda.
- Eliminar el bloque adicional de filtros `Todos los idiomas / Español / Inglés`.
- Mantener el orden alfabético y reiniciar la paginación al cambiar idioma, estado o búsqueda.
- Conservar exactamente el espaciado de la vista `Solo activos` entre `Término`, `Idioma` y `Valor` en todas las combinaciones.
- Mantener las pruebas frontend y los textos accesibles coherentes con el control superior.
- No modificar endpoints, modelos, repositorios ni lógica del backend.

## Capabilities

### New Capabilities

<!-- No se introduce una capacidad independiente. -->

### Modified Capabilities

- `dictionary-ui`: usar el selector superior de idioma, eliminar el bloque adicional y conservar el espaciado de la tabla.
- `dictionary-ui-pagination`: aplicar el idioma seleccionado al total y al reinicio de paginación.

## Impact

- Código afectado: componentes, hook, tipos, estilos y pruebas del diccionario en `frontend/src/pages/Dictionary` y `frontend/src/types`.
- Especificaciones afectadas: deltas de `dictionary-ui` y `dictionary-ui-pagination`.
- Dependencias: no se añaden dependencias nuevas.
- Backend/API: sin cambios.
- Verificación: lint, pruebas Vitest y build del frontend.
