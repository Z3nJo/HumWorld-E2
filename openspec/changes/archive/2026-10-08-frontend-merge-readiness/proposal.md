# Proposal

## Why

La implementación del frontend tiene una base funcional, pero todavía no cumple completamente los contratos del diccionario ni la Definition of Done del entorno local. El filtro de estado no está conectado, los inactivos quedan inaccesibles desde la UI, el contenedor Docker no sirve la aplicación y la funcionalidad principal carece de cobertura automatizada suficiente para aprobar el merge.

## What Changes

- Integrar el selector de estado existente en la pantalla del diccionario con las vistas Solo activos, Solo inactivos y Todos.
- Aplicar el filtro seleccionado junto con la búsqueda, manteniendo el orden alfabético y mostrando estados vacíos adecuados.
- Completar la búsqueda con debounce de 300 ms hacia el endpoint del diccionario, manteniendo el resaltado y la combinación con el filtro vigente.
- Reiniciar la paginación al cambiar búsqueda o filtro y ajustar la página tras operaciones CRUD que reduzcan el total.
- Añadir pruebas Vitest/Testing Library para carga, filtros, búsqueda combinada, CRUD, errores, eliminación lógica y paginación.
- Convertir el contenedor frontend en un servicio funcional: instalar dependencias, copiar la aplicación y arrancar Vite en `0.0.0.0:5173`.
- Configurar el proxy Docker para que las solicitudes `/api` lleguen al servicio `backend` en el puerto 3000.
- Mantener el alcance limitado al frontend, sus contratos OpenSpec, sus pruebas y su integración de ejecución local.

## Capabilities

### New Capabilities

- `frontend-runtime`: Servicio frontend ejecutable en Docker, accesible en `http://localhost:5173/` y capaz de enrutar `/api` hacia el backend configurado.

### Modified Capabilities

- `dictionary-ui`: Completar el filtrado por estado, la visibilidad de términos inactivos y la cobertura observable de la pantalla de diccionario.
- `dictionary-ui-pagination`: Garantizar el reinicio y ajuste de página al combinar búsqueda, filtros y operaciones CRUD.

## Impact

- Código afectado: `src/pages/Dictionary/DictionaryPage.tsx`, `src/pages/Dictionary/hooks/useDictionary.ts`, componentes del diccionario y sus pruebas.
- Configuración afectada: `Dockerfile`, configuración del proxy de Vite y/o variables del servicio frontend en `opsx/docker-compose.yml`.
- Verificación: `npm run lint`, `npm test`, `npm run build` y `docker compose -f opsx/docker-compose.yml up --build`.
- No se modifican endpoints ni contratos del backend.
