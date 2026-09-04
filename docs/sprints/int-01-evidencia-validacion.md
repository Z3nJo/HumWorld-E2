# Evidencia de validacion INT-01

## Alcance implementado

La prueba vertical API-BD de captura entra por `POST /api/v1/sources/capture`.
Sustituye solamente la lectura RSS por entradas controladas y conserva FastAPI,
el servicio de captura, el repositorio y PostgreSQL reales. Verifica insercion,
conteos por fuente, entradas invalidas, deduplicacion por `(id_fuente,
guid_origen)`, persistencia de los campos de noticia y `fecha_ultima_captura`.

Las pruebas de configuracion verifican `GET /api/v1/config`, `PUT /api/v1/config`
y el rechazo de payloads invalidos sin alterar las filas persistidas.

## CI

El workflow `.github/workflows/ci.yml` aplica migraciones Alembic y ejecuta
`pytest --cov=. --cov-report=term-missing --cov-fail-under=80` con el servicio
PostgreSQL 16. Por tanto, cualquier fallo de las pruebas API-BD bloquea el job
`docker-compose-check`.

Validacion local ejecutada el 2026-09-04 contra PostgreSQL 16 iniciado desde
`opsx/docker-compose.yml` con la base `humworld_test`:

```text
$env:DATABASE_URL = 'postgresql://humworld:humworld@localhost:5432/humworld_test'
Set-Location backend
alembic upgrade head
pytest --cov=. --cov-report=term-missing --cov-fail-under=80 -p no:cacheprovider
```

Resultado: `78 passed in 4.13s`, cobertura total `96.92%` y umbral requerido
del `80%` superado. Las dos pruebas de `test_capture_api_postgresql.py`
cubrieron la captura API-BD, la deduplicacion y el `404` atomico.

La evidencia remota definitiva esta en verde: [CI del PR de ramaCICD, run 33873089786](https://github.com/Z3nJo/HumWorld-E2/actions/runs/33873089786), ejecutado sobre el commit `2494b04ea83d40728ebcf356f4cb68f19c44d415`. El workflow de tipo `pull_request` finalizo correctamente el 2026-09-04 y el job `docker-compose-check` valido migraciones, contratos y pruebas backend contra PostgreSQL.

## Frontend-API pendiente

`frontend/` aun no contiene `package.json`, una aplicacion React/Vite ni vistas
que consuman configuracion o captura. Tampoco declara endpoints que no existan
en OpenAPI. Por ello no se crea una prueba artificial en esta fase.

Tarea trazable futura: `INT-01-FE-01`. Al crear la primera vista de
configuracion runtime o accion de captura manual, agregar una prueba
Frontend-API que consuma exclusivamente `/api/v1/config` y
`POST /api/v1/sources/capture` contra un backend de prueba compatible con
OpenAPI.
