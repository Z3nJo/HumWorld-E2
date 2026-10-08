# Tasks

## 1. Alinear la decision arquitectonica

- [x] 1.1 Actualizar ADR-004 para describir la arquitectura como separacion ligera por funcionalidades, incluyendo las dependencias permitidas y la excepcion explicita de `application` -> `infrastructure`; verificar que el documento no contradiga ADR-000 ni ADR-003.
- [x] 1.2 Documentar la migracion progresiva desde `src/api`, `src/types` y `src/pages` hacia `src/features`, indicando que el codigo existente no se reescribe como prerrequisito; verificar que un nuevo colaborador pueda identificar que estructura aplicar a codigo nuevo.
- [x] 1.3 Aclarar en ADR-004 la politica de `shared`, la configuracion `VITE_API_URL`/proxy `/api` y el uso uniforme de rutas `/api/v1`; verificar las referencias contra `frontend-runtime` y el codigo actual.

## 2. Establecer la frontera HTTP y de pruebas

- [x] 2.1 Disenar y documentar el contrato de `shared/api/httpClient.ts`, incluyendo serializacion, errores, base URL y compatibilidad con Docker; verificarlo con una prueba unitaria de errores y respuestas JSON.
- [x] 2.2 Definir en la documentacion de frontend la separacion entre dominio, infraestructura, aplicacion y presentacion, con ejemplos de imports permitidos y prohibidos; verificar que las reglas cubran el diccionario actual y las funcionalidades futuras.
- [x] 2.3 Documentar la estrategia de pruebas unitarias sin DOM/red y de integracion Frontend <-> API; verificar que incluya el comando de Vitest y el entorno requerido para una llamada real.

## 3. Aplicacion incremental

- [x] 3.1 Aplicar la convencion a la funcionalidad de diccionario, creando solo las subcarpetas que contienen codigo; verificar la estructura mediante revision de imports y build TypeScript. Verificado con `features/dictionary/{domain,infrastructure,application}` y build exitoso.
- [x] 3.2 Migrar las funciones HTTP/DTO del diccionario a `features/dictionary/infrastructure`, su modelo a `domain` y su orquestacion a `application`; verificar que las pruebas existentes sigan pasando y que ningun componente realice `fetch`. Verificado con busqueda de imports y tests exitosos.
- [x] 3.3 Anadir pruebas unitarias para los mapeadores y funciones de dominio de la funcionalidad migrada; verificar con `npm run test` que se ejecutan sin DOM ni red cuando corresponda. Verificado con `npm run test`: 10 pruebas exitosas.

## 4. Verificacion transversal

- [x] 4.1 Incorporar los criterios de frontera acordados a la Definition of Done o checklist de pull request; verificar que contemplen HTTP fuera de `shared/api`, DTOs fuera de `infrastructure` e imports entre funcionalidades.
- [x] 4.2 Ejecutar `npm run lint`, `npm run build` y `npm run test` en `frontend`; verificar que el resultado sea exitoso sin modificar contratos del backend.
- [x] 4.3 Ejecutar una prueba de integracion contra el entorno Docker y consultar al menos un endpoint `/api/v1`; verificar que la UI procesa la respuesta mediante la frontera HTTP documentada. Verificado con HTTP 200 en `http://localhost:5173/` y `http://localhost:5173/api/v1/dictionary`.
