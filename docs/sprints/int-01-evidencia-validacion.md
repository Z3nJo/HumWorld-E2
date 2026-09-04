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

El ultimo run remoto observado esta en verde: [CI en main, run 33684045586](https://github.com/Z3nJo/HumWorld-E2/actions/runs/33684045586), finalizado el 2026-09-02. Ese run es anterior a este cambio local en `ramaCICD`; la evidencia definitiva de INT-01 requiere un nuevo run verde tras publicar una rama o pull request hacia `main` o `develop`.

## Frontend-API pendiente

`frontend/` aun no contiene `package.json`, una aplicacion React/Vite ni vistas
que consuman configuracion o captura. Tampoco declara endpoints que no existan
en OpenAPI. Por ello no se crea una prueba artificial en esta fase.

Tarea trazable futura: `INT-01-FE-01`. Al crear la primera vista de
configuracion runtime o accion de captura manual, agregar una prueba
Frontend-API que consuma exclusivamente `/api/v1/config` y
`POST /api/v1/sources/capture` contra un backend de prueba compatible con
OpenAPI.
