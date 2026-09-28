# Evidencia de validacion INT-02

Fecha de revalidacion local: 2026-09-28, sobre `main` en `52349a6` (Docker Compose y
PostgreSQL 16). Las pruebas de integracion API-BD del Sprint se incorporaron en los PR #23
(diccionario, 2026-09-21), #30 (analisis de noticias, 2026-09-25) y #40 (purgado, 2026-09-25).

## Alcance implementado

La integracion vertical API-BD del Sprint 2 verifica el funcionamiento conjunto de todas
las nuevas capacidades sobre FastAPI, SQLAlchemy 2.0 y PostgreSQL 16 real:

1. **Diccionario (`/api/v1/dictionary`):** listado determinista, busqueda insensible a mayusculas
   y tildes, altas con estado por defecto o explicito, reemplazo `PUT`, actualizacion parcial
   `PATCH`, unicidad relacional `(palabra, idioma)`, rollback ante conflictos y eliminacion
   logica idempotente `DELETE` (`204`).
2. **Analisis puntual (`/api/v1/sentiment`):** endpoint de solo lectura que evalua texto libre
   contra los terminos activos en base de datos, garantizando paridad algoritmica con el motor
   por lotes y ausencia total de efectos secundarios en persistencia.
3. **Captura y analisis conjunto (`POST /api/v1/sources/capture`):** ciclo completo de
   captura de noticias, resolucion de parametros de sentimiento desde la base de datos,
   asignacion de `valor_humor` y creacion transaccional de desgloses en `noticia_termino`.
4. **Recuperacion de noticias pendientes:** ejecucion de `process_pending_news()` que reclama
   y calcula noticias almacenadas con `fecha_analisis IS NULL` sin alterar noticias previas.
5. **Purgado de caducidad:** eliminacion fisica de noticias anteriores a la retencion configurada
   y borrado en cascada de `noticia_termino`.
6. **Migraciones reversibles:** ciclo de migraciones Alembic `base -> head -> base -> head`
   verificado contra PostgreSQL 16 sin perdida de consistencia.

## CI y ejecucion de pruebas

El workflow de GitHub Actions (`.github/workflows/ci.yml`, job `docker-compose-check`) levanta
PostgreSQL 16 como servicio (`humworld_test`) y ejecuta, en orden:

1. Checkout y Python 3.12.
2. Validacion de la configuracion: `docker compose -f opsx/docker-compose.yml config`.
3. Sincronizacion de contratos OpenSpec: `python opsx/sync_contracts.py --check`.
4. Instalacion de dependencias del backend, `pytest` y `pytest-cov`.
5. Control de calidad del frontend: `npm run lint`, solo si `frontend/package.json` define un
   script `lint`; el backend no tiene paso de formateo ni linting.
6. Migraciones Alembic desde `backend/`: `alembic upgrade head`.
7. Suite completa del backend con umbral minimo de cobertura del 80 %, desde `backend/`:
   `pytest --cov=. --cov-report=term-missing --cov-fail-under=80`.
8. Pruebas del frontend (`npm test`), solo si existe el script `test`.
9. Construccion de imagenes: `docker compose -f opsx/docker-compose.yml build`.

Validacion local con el mismo comando de CI, ejecutada en un contenedor `python:3.12-slim`
(Python 3.12.14, pytest 8.4.2, pytest-cov 7.1.0) conectado a la red de Docker Compose, con
`DATABASE_URL=postgresql://humworld:humworld@postgres:5432/humworld_test` sobre una base recien
creada:

```text
alembic upgrade head
INFO  [alembic.runtime.migration] Running upgrade  -> 20260828_01, Create channel and RSS source tables.
INFO  [alembic.runtime.migration] Running upgrade 20260828_01 -> 20260830_01, Create configuration table.
INFO  [alembic.runtime.migration] Running upgrade 20260830_01 -> 20260901_01, Create news table for automatic RSS capture.
INFO  [alembic.runtime.migration] Running upgrade 20260901_01 -> 20260921_01, Create dictionary term table.
INFO  [alembic.runtime.migration] Running upgrade 20260921_01 -> 20260924_01, Persist news sentiment and term contributions.

pytest --cov=. --cov-report=term-missing --cov-fail-under=80
collected 168 items
[... progreso y detalle de cobertura por archivo omitidos ...]
TOTAL                                                          3864     92    98%
Required test coverage of 80% reached. Total coverage: 97.62%
====================== 168 passed, 11 warnings in 11.04s =======================
```

El resultado coincide con la ejecucion de CI sobre `main` (run 36192420881: `168 passed,
11 warnings`, `Total coverage: 97.62%`). El umbral DoD del 80 % se supera con **97,62 %** de
cobertura total, con cero pruebas fallidas y cero omitidas.

El ciclo reversible de migraciones se verifico sobre la misma base:

```text
alembic downgrade base
INFO  [alembic.runtime.migration] Running downgrade 20260924_01 -> 20260921_01, Persist news sentiment and term contributions.
INFO  [alembic.runtime.migration] Running downgrade 20260921_01 -> 20260901_01, Create dictionary term table.
INFO  [alembic.runtime.migration] Running downgrade 20260901_01 -> 20260830_01, Create news table for automatic RSS capture.
INFO  [alembic.runtime.migration] Running downgrade 20260830_01 -> 20260828_01, Create configuration table.
INFO  [alembic.runtime.migration] Running downgrade 20260828_01 -> , Create channel and RSS source tables.

alembic upgrade head
[... lineas anteriores omitidas ...]
INFO  [alembic.runtime.migration] Running upgrade 20260921_01 -> 20260924_01, Persist news sentiment and term contributions.
alembic current
20260924_01 (head)
```

## Verificacion de contratos OpenSpec

Todos los contratos entregables en `opsx/contracts/` se contrastaron contra las especificaciones
fuente de `openspec/specs/`:

```text
python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```

El paso supero la comprobacion certificando la sincronizacion de las siete capacidades publicadas:

- `rss-source-management`
- `runtime-configuration`
- `rss-news-capture`
- `dictionary-management`
- `news-sentiment-analysis`
- `news-purging`
- `integration-verification`

Validacion estricta de todas las especificaciones y cambios activos con el CLI de OpenSpec 1.9.0:

```text
openspec validate --all --strict
✓ spec/dictionary-management
✓ change/e2-h02-news-sentiment
✓ change/e4-h02-news-purging
✓ spec/integration-verification
✓ spec/news-purging
✓ spec/news-sentiment-analysis
✓ spec/python-postgres-cicd-stack
✓ spec/rss-news-capture
✓ spec/rss-source-management
✓ spec/runtime-configuration
Totals: 10 passed, 0 failed (10 items)
```

## Estado de la integracion Frontend-API

En el Sprint 2 se priorizo la completitud y robustez de la capa de logica y datos del backend,
dejando las interfaces de usuario correspondientes (`E2-H01-UI` para administracion del
diccionario y `E3-H01`/`E3-H02`/`E3-H03` para dashboards y mapas) para el Sprint 3.
Todos los endpoints publican sus contratos tipados en OpenAPI (`/api/openapi.json`), listos
para ser consumidos por el cliente React/Vite.
