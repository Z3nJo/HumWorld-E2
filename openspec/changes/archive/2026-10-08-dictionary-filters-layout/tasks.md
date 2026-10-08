# Tasks

## 1. Filtro superior de idioma

- [x] 1.1 Conservar el selector superior `Idioma` con las opciones `Español` e `Inglés`, eliminando el bloque adicional; verificar que solo existe un control visual de idioma para filtrar.
- [x] 1.2 Conectar la selección superior con el filtrado de la tabla y combinarla con estado y búsqueda; verificar términos correctos en ambas combinaciones.
- [x] 1.3 Mantener el comparador alfabético y el reinicio de página al cambiar idioma o estado; verificar el orden y la primera página.

## 2. Espaciado y regresión visual

- [x] 2.1 Restaurar el layout original de `Solo activos` entre `Término`, `Idioma` y `Valor`; verificar que no se usan `table-layout: fixed`, `colgroup` ni anchos nuevos.
- [x] 2.2 Mantener insignias, acciones inline, textos accesibles y mensajes vacíos; verificar las operaciones CRUD existentes.

## 3. Verificación integrada

- [x] 3.1 Cubrir el selector superior, filtros combinados, orden, paginación y estados vacíos con Vitest; verificar con `npm.cmd test -- --run`.
- [x] 3.2 Ejecutar `npm.cmd run lint`, `npm.cmd run build` y `openspec validate --specs --strict --no-interactive`; verificar que todos terminan correctamente.

## Workflow follow-up

- Sincronizar los deltas con las specs principales usando `openspec-sync-specs`.
- Archivar el cambio usando `openspec-archive-change`.
