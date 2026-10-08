# Design

## Context

El frontend ya mantiene los términos cargados en estado local y dispone de `StatusFilter`, paginación y un cliente API, pero el filtro no está conectado a la página y el hook excluye siempre los términos inactivos. La configuración de Vite ya tiene proxy `/api`, aunque su destino por defecto `localhost:3000` no es válido dentro del contenedor frontend cuando el backend vive en otro servicio Docker.

## Goals / Non-Goals

**Goals:**

- Centralizar en el hook la selección de estado, búsqueda y derivación de términos visibles.
- Ejecutar la búsqueda contra el backend después de 300 ms de inactividad, evitando una solicitud por pulsación.
- Mantener la paginación derivada de los resultados filtrados y reiniciarla ante cambios de búsqueda o estado.
- Probar los flujos observables de la pantalla con mocks de API y controles accesibles.
- Hacer que el servicio Docker instale, construya y ejecute el frontend con un proxy interno al servicio `backend`.

**Non-Goals:**

- Cambiar endpoints, modelos o comportamiento del backend.
- Introducir autenticación, paginación server-side o nuevas dependencias de runtime.
- Rediseñar el shell general o las especificaciones de `app-shell`.

## Decisions

1. **Estado del filtro en `DictionaryPage`, filtrado derivado en `useDictionary`.** La página conservará la opción seleccionada y la pasará al hook o a su selector derivado. Esto mantiene la interacción de paginación cerca de la vista y evita duplicar reglas de estado en los componentes de tabla. Se descarta implementar tres consultas independientes porque el contrato actual trabaja con la colección del diccionario y el filtro es una preocupación de presentación.

2. **Búsqueda server-side con debounce y filtro de estado local.** La consulta textual se enviará mediante `fetchTerms(q)` después del debounce, mientras el estado activo/inactivo/todos se aplicará sobre la respuesta recibida. Así se cumple el contrato existente sin exigir cambios en el endpoint. Se descarta hacer toda la búsqueda local porque no satisface el requisito explícito de envío al servidor.

3. **Paginación controlada y reajustable.** Los cambios de búsqueda y filtro establecerán la página en cero; el índice visible se limitará además a la última página válida cuando un CRUD reduzca el resultado. La paginación seguirá siendo local para conservar el límite de 12 filas y el comportamiento actual.

4. **Pruebas de integración de la página con API mockeada.** Se cubrirá la composición de hook, controles, tabla y operaciones CRUD desde `DictionaryPage`, complementándola con pruebas unitarias si ayudan a aislar derivaciones. Se usará el stack Vitest/Testing Library ya instalado y no se añadirá una dependencia de mocking externa.

5. **Vite en desarrollo dentro del contenedor.** El Dockerfile instalará dependencias y ejecutará `npm run dev -- --host 0.0.0.0`; el destino del proxy se configurará como `http://backend:3000` en Compose. Se elige este camino porque el entorno documentado usa Vite y permite conservar hot reload y la configuración existente sin introducir un servidor de producción adicional.

## Risks / Trade-offs

- [Riesgo] Una respuesta de búsqueda puede llegar después de otra más reciente y sobrescribirla → asociar la carga al último valor consultado o cancelar/ignorar respuestas obsoletas.
- [Riesgo] Un término creado puede no pertenecer al filtro actual → conservar la actualización optimista, pero derivar la visibilidad según filtro y reajustar la página tras el cambio.
- [Riesgo] El nombre `backend` depende del compose → mantener el destino configurable mediante `VITE_API_TARGET`, usando `http://backend:3000` solo en el servicio Docker.
- [Riesgo] Las pruebas pueden depender de temporizadores de debounce → usar fake timers y esperar explícitamente la estabilización de las actualizaciones asíncronas.

## Migration Plan

1. Implementar el filtro, la búsqueda y el reajuste de paginación manteniendo la API pública del backend.
2. Añadir la suite frontend y ejecutar lint, tests y build.
3. Actualizar el Dockerfile y la variable de proxy del servicio frontend.
4. Validar `docker compose -f opsx/docker-compose.yml up --build` y una consulta `/api` desde la UI.
5. Para rollback, restaurar el Dockerfile/configuración y los componentes del cambio; no hay migraciones de datos ni cambios de API.
