## Context

El backend ya usa FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16 y pruebas `pytest` con marca `integration`. El workflow de CI levanta PostgreSQL, aplica migraciones y ejecuta la suite backend con cobertura. La configuracion runtime ya cuenta con pruebas API-BD contra PostgreSQL; captura RSS cuenta con pruebas unitarias de servicio y pruebas PostgreSQL de repositorio, pero el endpoint `POST /api/v1/sources/capture` no queda verificado actualmente atravesando API, servicio real, repositorio real y base de datos real en un unico escenario.

El frontend aun no tiene aplicacion React/Vite implementada; por eso la parte Frontend-API de INT-01 debe quedar definida como contrato y activarse cuando exista una vista que consuma configuracion o captura.

## Goals / Non-Goals

**Goals:**

- Cubrir una prueba vertical API-BD estricta para captura manual usando la API publica como punto de entrada.
- Mantener el feed RSS bajo control de la prueba, sin depender de Internet ni de proveedores externos.
- Reutilizar el patron existente de fixtures PostgreSQL, migraciones Alembic y `TestClient`.
- Confirmar que configuracion runtime sigue cubierta verticalmente contra PostgreSQL.
- Dejar preparado el criterio Frontend-API de INT-01 sin bloquear este cambio por la ausencia actual de UI.
- Asegurar que CI ejecute las pruebas verticales y falle ante regresiones.

**Non-Goals:**

- No implementar nuevas funcionalidades de captura, configuracion, scheduler o UI.
- No cambiar el modelo de datos ni agregar migraciones.
- No introducir pruebas end-to-end con proveedores RSS reales.
- No implementar la aplicacion frontend pendiente.

## Decisions

1. La prueba de captura vertical entrara por `POST /api/v1/sources/capture`.

   Rationale: INT-01 debe demostrar integracion entre capas desde la frontera publica, no solo persistencia de repositorio. Usar el endpoint obliga a validar serializacion HTTP, dependencias FastAPI, servicio, repositorio y PostgreSQL.

   Alternative considered: mantener solo pruebas de `NewsCaptureRepository`. Se descarta porque no verifica la frontera API-BD completa.

2. El cliente RSS se sustituira por un doble controlado en la dependencia del endpoint.

   Rationale: la especificacion de captura exige pruebas reproducibles sin red real. La prueba debe seguir usando servicio y repositorio reales, sustituyendo solo el proveedor externo inestable.

   Alternative considered: servir un RSS local por HTTP. Es mas cercano a red real, pero agrega complejidad operativa innecesaria para validar API-BD.

3. La base PostgreSQL de integracion sera migrada y limpiada por fixtures antes del escenario.

   Rationale: el pipeline ya provee PostgreSQL 16 y las pruebas existentes siguen este patron. Mantenerlo evita SQLite y reproduce constraints como unicidad compuesta y cascadas.

   Alternative considered: usar una base embebida por velocidad. Se descarta porque no valida el gestor elegido por ADR-003.

4. El alcance Frontend-API queda condicional a que exista una superficie frontend real.

   Rationale: hoy `frontend/` es placeholder. Forzar una prueba Frontend-API ahora obligaria a construir UI fuera de esta tarea o a crear una prueba artificial sin valor funcional.

   Alternative considered: crear un cliente frontend minimo solo para satisfacer INT-01. Se descarta porque mezclaria infraestructura de frontend con una tarea de verificacion.

5. La evidencia se registrara con salida de comandos y enlace al run de CI.

   Rationale: la DoD pide validacion funcional y CI en verde. La evidencia debe permitir reconstruir que los escenarios de integracion fueron ejecutados por el pipeline y no solo localmente.

## Risks / Trade-offs

- Riesgo: sustituir el cliente RSS en la dependencia incorrecta puede convertir la prueba en una prueba con servicio falso. -> Mitigacion: el doble solo reemplaza la lectura externa del feed; servicio, repositorio y base deben ser reales.
- Riesgo: fixtures de base compartida pueden dejar estado entre pruebas. -> Mitigacion: truncar tablas involucradas con `RESTART IDENTITY CASCADE` antes y despues del escenario.
- Riesgo: la parte Frontend-API de INT-01 quede declarada pero no ejecutada hasta Sprint 3. -> Mitigacion: documentar la condicion actual y crear tareas explicitas para activarla cuando exista `frontend/package.json` y vistas consumidoras.
- Riesgo: CI local y remoto diverjan por variables de entorno. -> Mitigacion: usar `DATABASE_URL` del workflow y documentar el comando local equivalente.

## Migration Plan

No hay migracion de datos ni despliegue funcional. La incorporacion se limita a pruebas, documentacion y verificacion de CI.

Rollback: revertir los archivos de prueba/documentacion del cambio. No quedan cambios persistentes en esquema ni comportamiento runtime.
