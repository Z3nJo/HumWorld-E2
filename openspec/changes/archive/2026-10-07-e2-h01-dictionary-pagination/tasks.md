# Tasks

## 1. Estado y derivación de páginas

- [x] 1.1 Añadir el estado local de página y la constante de 12 términos por página en `DictionaryPage`; verificar que la página inicial es la primera y que el proyecto compila con `npm run build`.
- [x] 1.2 Derivar los términos de la página actual a partir de `visibleTerms`, calcular el total de páginas y ajustar la página al último índice válido cuando cambie el total; verificar los casos de 0, 1, 12 y 13 términos.
- [x] 1.3 Reiniciar la página al cambiar la búsqueda o el filtro de estado y conservar una página válida después de crear o eliminar términos; verificarlo navegando a una página posterior antes de cambiar cada criterio.

## 2. Controles y presentación

- [x] 2.1 Pasar únicamente los términos de la página actual a `TermTable` sin alterar sus operaciones de edición, eliminación ni resaltado; verificar que nunca se muestran más de 12 filas.
- [x] 2.2 Añadir el pie de paginación con rango visible, total de resultados, indicador `Página X / Y` y botones `Anterior` / `Siguiente`; verificar que los botones cambian de página sin recargar.
- [x] 2.3 Aplicar estilos coherentes con la interfaz existente y estados accesibles de foco y deshabilitado; verificar visualmente la primera página, una página intermedia y la última.

## 3. Integración y validación

- [x] 3.1 Verificar que búsqueda, filtros de estado, creación, edición y eliminación siguen operando sobre el conjunto completo y actualizan correctamente la página visible.
- [x] 3.2 Ejecutar las comprobaciones del frontend (`npm run lint` y `npm run build`) y validar que no quedan errores de TypeScript ni de lint.

## Workflow follow-up

- Revisar la implementación y la evidencia visual con el equipo.
- Archivar el cambio con `openspec-archive-change` después de completar y validar todas las tareas.
