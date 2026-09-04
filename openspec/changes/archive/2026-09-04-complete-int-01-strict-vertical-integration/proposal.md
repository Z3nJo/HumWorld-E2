## Why

INT-01 necesita una verificacion vertical estricta que demuestre que las fronteras API-BD y Frontend-API se prueban de forma automatizada, reproducible y ejecutada en CI. El sistema ya tiene cobertura parcial para captura y configuracion, pero falta explicitar y completar un escenario end-to-end controlado que cierre la brecha entre endpoint, servicio, repositorio y PostgreSQL, y que deje preparada la expansion al frontend cuando exista la UI.

## What Changes

- Introducir una capacidad de verificacion de integracion que defina el alcance minimo de una prueba vertical estricta para INT-01.
- Agregar un escenario API-BD para captura manual que invoque `POST /api/v1/sources/capture`, use un feed controlado sin red real, atraviese el servicio y repositorio reales, y verifique la persistencia en PostgreSQL.
- Consolidar la verificacion API-BD de configuracion mediante `GET /api/v1/config` y `PUT /api/v1/config` sobre PostgreSQL migrado.
- Definir que las pruebas verticales se ejecutan dentro del workflow de CI y fallan el pipeline si la integracion se rompe.
- Preparar el criterio Frontend-API para INT-01 completo: cuando exista la UI React/Vite, debera consumir la API publicada y verificarse contra un backend real o servidor de API controlado compatible con OpenAPI.
- Registrar evidencia reproducible de la ejecucion local/CI y de los escenarios cubiertos.

## Capabilities

### New Capabilities

- `integration-verification`: verificacion automatizada de escenarios verticales entre capas, incluyendo API-BD, Frontend-API y ejecucion obligatoria en CI.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: pruebas `pytest` de integracion contra PostgreSQL, fixtures de FastAPI/TestClient y dobles controlados para feeds RSS sin acceso a Internet.
- CI: workflow `.github/workflows/ci.yml` debe seguir aplicando migraciones y ejecutando la suite completa contra PostgreSQL.
- Frontend: queda definido el contrato de verificacion Frontend-API para cuando exista la aplicacion React/Vite.
- Documentacion: evidencia de sprint/release y README de pruebas deben reflejar que INT-01 se verifica en pipeline.
