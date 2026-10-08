# Tasks

## 1. Estado del diccionario y búsqueda

- [x] 1.1 Integrar `StatusFilter` en `DictionaryPage` con estado inicial `active`, y pasar la opción seleccionada al cálculo de términos visibles; verificar manualmente que los tres botones cambian la tabla sin recarga.
- [x] 1.2 Actualizar `useDictionary` para filtrar `active`, `inactive` y `all`, conservar el orden alfabético y exponer mensajes coherentes para listas vacías; verificar con datos activos e inactivos mezclados.
- [x] 1.3 Conectar la búsqueda debounced de 300 ms con `fetchTerms(q)`, ignorando respuestas obsoletas y manteniendo el filtro de estado y el resaltado; verificar que una ráfaga de escritura produce una sola consulta final.
- [x] 1.4 Añadir pruebas de carga inicial, las tres opciones de estado, estados vacíos, búsqueda combinada, preservación de tildes y debounce usando Vitest/Testing Library; verificar con `npm test -- --run`.

## 2. Paginación y operaciones CRUD

- [x] 2.1 Reiniciar la página al cambiar búsqueda o filtro y limitarla a la última página válida después de crear, editar o eliminar; verificar rangos, botones deshabilitados y eliminación lógica visible en `inactive`/`all`.
- [x] 2.2 Añadir pruebas de 12 elementos por página, navegación, reinicio de página, reajuste tras borrar y orden alfabético; verificar con `npm test -- --run`.
- [x] 2.3 Cubrir creación, edición, eliminación y errores de API con mocks, incluyendo rollback de operaciones optimistas y toasts; verificar que los datos se conservan ante errores.

## 3. Ejecución Docker del frontend

- [x] 3.1 Actualizar `frontend/Dockerfile` para instalar dependencias, copiar el proyecto y arrancar Vite escuchando en `0.0.0.0:5173`; verificar que el build de la imagen completa correctamente.
- [x] 3.2 Configurar el destino del proxy `/api` para Docker como `http://backend:3000`, manteniendo una configuración local configurable; verificar que el navegador no necesita una URL absoluta de API.
- [x] 3.3 Ejecutar `docker compose -f opsx/docker-compose.yml up --build` y comprobar `http://localhost:5173/` y una solicitud `/api/v1/dictionary`; verificar que no aparece `ERR_EMPTY_RESPONSE` y que la UI recibe datos.

## 4. Verificación de calidad

- [x] 4.1 Ejecutar `npm run lint`, `npm test` y `npm run build` desde `frontend`; verificar que los tres comandos terminan con código 0.
- [x] 4.2 Ejecutar `openspec validate --specs --strict --no-interactive` desde `frontend`; verificar que las especificaciones y deltas del cambio son válidas.

## Workflow follow-up

- Revisar la evidencia automatizada y manual antes de aprobar el merge.
- Aplicar el cambio mediante `$openspec-apply-change` cuando se autorice la implementación.
