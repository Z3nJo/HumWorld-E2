# Backend

API REST de HumWorld desarrollada con Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic y PostgreSQL 16.

## Configuracion

La variable obligatoria `DATABASE_URL` admite tanto la URL generica de la infraestructura como el dialecto explicito de psycopg 3:

Para desarrollo local, copiar `backend/.env.example` a `backend/.env` y completar
`DATABASE_URL` con credenciales privadas y host `localhost`. Para Docker, usar el
`.env` de la raíz con host `postgres`. Consultar la [guía de provisión y rotación](../docs/operations/postgresql-credentials.md).

El backend normaliza internamente `postgresql://` a `postgresql+psycopg://`.
No existe una contraseña de respaldo. Los comandos Docker siguientes se ejecutan
desde la raíz con `--env-file .env`.

## Dashboard: evolución diaria y noticias influyentes

`GET /api/v1/dashboards/geografia?fecha_desde=2026-10-01&fecha_hasta=2026-10-07`
devuelve agregados por continente (`pais=null`) y por país (`pais` ISO) para el
mapa y la tabla. Conserva el contexto geográfico completo al filtrar un país
en el resumen, evolución y noticias. Los filtros usan los países atribuidos por
mención y no la procedencia editorial. Una noticia se cuenta una vez por país y
una vez por continente; si fue clasificada sin país, usa el continente del canal.

`GET /api/v1/dashboards/evolucion` devuelve `fecha_desde`, `fecha_hasta`,
`continente`, `pais` y `dias`: una entrada por fecha UTC con `fecha`, `humor`,
`noticias` y `suficiente`. Sin fechas usa los últimos 30 días, incluido hoy UTC.
Se pueden enviar `fecha_desde` y `fecha_hasta` inclusivas (máximo 366 días).
Los días sin noticias evaluables llevan conteo cero y humor nulo; `suficiente`
respeta `minimo_noticias_agregacion`.

`GET /api/v1/dashboards/noticias-influyentes?fecha_desde=2026-10-01&fecha_hasta=2026-10-07`
devuelve `noticias` con las diez noticias evaluables de mayor `abs(valor_humor)`.
Los empates se ordenan por registro más reciente y luego por ID ascendente.
Cada elemento incluye `id_noticia`, `titulo`, `url`, `canal`, `continente`,
`pais`, `fecha_registro` y `valor_humor`.

Ambas rutas aceptan los filtros opcionales `continente` y `pais` (ISO de dos
letras; requiere continente). El conteo considera solo noticias con humor
calculado, igual que el dashboard agregado. No requieren migraciones.

## Instalacion local

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

En Linux o macOS, active el entorno mediante `source .venv/bin/activate` y use `python -m pip`.

## Migraciones

Desde `backend/`, con `DATABASE_URL` configurada:

```bash
alembic upgrade head
alembic downgrade base
```

Las migraciones crean las tablas del backend implementadas hasta el momento conforme a MOD-01, incluyendo `canal`, `fuente_rss`, `configuracion`, `noticia` y `termino`.

## Carga inicial de fuentes RSS

Despues de aplicar las migraciones, ejecute el seed versionado desde `backend/`:

```bash
alembic upgrade head
python -m app.seeds.sources
```

El comando registra seis canales y seis fuentes RSS activas, una para cada
continente admitido: `Africa`, `America`, `Antartida`, `Asia`, `Europa` y
`Oceania`. Para America usa `PBS NewsHour Headlines`. No descarga ni valida
remotamente los feeds.

El seed es idempotente: puede ejecutarse nuevamente sin duplicar registros. Si
encuentra un canal o una URL con datos incompatibles, revierte la ejecucion
completa y muestra el conflicto en lugar de sobrescribir los datos existentes.
Las instalaciones inicializadas con la antigua fuente CBC se reconcilian en
sitio hacia PBS, conservando los identificadores y las noticias relacionadas.

El seed completa el país de los canales conocidos PBS (`US`), CNA (`SG`),
DW (`DE`) y ABC (`AU`) si está vacío, y respeta cualquier país ya asignado.
Después de actualizar el backend, repítalo para completar los canales existentes:

```powershell
docker compose --env-file .env -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
```

## API de fuentes RSS

Base: `/api/v1` · Swagger: `/api/docs` · OpenAPI JSON: `/api/openapi.json`.

| Metodo | Ruta | Proposito |
|---|---|---|
| `POST` | `/sources` | Crear un canal con una o mas fuentes, o agregarlas a un canal existente |
| `GET` | `/sources` | Listar y filtrar por `continent`, `active`, `channel_id` y `country` |
| `GET` | `/sources/{source_id}` | Consultar una fuente |
| `PUT` | `/sources/{source_id}` | Reemplazar los campos editables |
| `PATCH` | `/sources/{source_id}` | Actualizar parcialmente los campos editables |
| `DELETE` | `/sources/{source_id}` | Eliminar una fuente conservando su canal |

Ejemplo de alta:

```json
{
  "channel": {
    "nombre": "Agencia Mundo",
    "continente": "America",
    "pais": "CL",
    "url_sitio": "https://example.com",
    "activo": true
  },
  "sources": [
    {
      "nombre": "Portada",
      "url_feed": "https://example.com/rss.xml",
      "categoria_iptc": "politics",
      "idioma": "es"
    }
  ]
}
```

Para un canal existente, sustituya `channel` por `"channel_id": 1`. `PUT` y
`PATCH` de fuentes no permiten modificar `id_canal`. Las respuestas de fuentes
incluyen el canal completo, `fecha_alta` y `fecha_ultima_captura`.

Los filtros se combinan de forma acumulativa. Por ejemplo, para consultar las
fuentes activas de un canal en Chile:

```bash
curl "http://localhost:3000/api/v1/sources?channel_id=1&country=cl&active=true"
```

El país se recibe como dos letras ASCII, se eliminan los espacios exteriores y
se devuelve en mayúsculas. Debe existir en el catálogo local y corresponder al
continente declarado; una incoherencia responde `400` sin escritura parcial.

## API de canales

Los canales representan el medio padre compartido por una o mas fuentes RSS.
Su creacion se mantiene dentro de `POST /api/v1/sources` para conservar el alta
atomica del canal y sus fuentes.

| Metodo | Ruta | Proposito |
|---|---|---|
| `GET` | `/channels` | Listar y filtrar por `continent`, `country` y `active` |
| `GET` | `/channels/{channel_id}` | Consultar un canal |
| `PUT` | `/channels/{channel_id}` | Reemplazar todos los campos editables |
| `PATCH` | `/channels/{channel_id}` | Actualizar uno o mas campos editables |
| `DELETE` | `/channels/{channel_id}` | Desactivar logicamente el canal |

`PUT` exige `nombre`, `continente`, `pais`, `url_sitio` y `activo`; los dos
campos opcionales pueden ser `null`. `PATCH` permite limpiar `pais` o
`url_sitio` enviando `null`, pero no acepta `null` para los otros campos.

```bash
curl -X PATCH http://localhost:3000/api/v1/channels/1 \
  -H "Content-Type: application/json" \
  -d '{"pais":"CL","url_sitio":"https://example.com","activo":true}'
```

La eliminacion es logica e idempotente: responde `204`, conserva el canal, sus
fuentes y las noticias, y no cambia el estado individual `activa` de cada
fuente. Para reactivar el canal:

```bash
curl -X PATCH http://localhost:3000/api/v1/channels/1 \
  -H "Content-Type: application/json" \
  -d '{"activo":true}'
```

Una fuente solo participa en la captura cuando tanto ella como su canal estan
activos. Además, cambiar `continente` o `pais` reconcilia en la misma transacción
solo las asociaciones históricas con origen `fuente`; las menciones se conservan.

## Catálogo y atribución geográfica

Después de migrar la base, cargue el catálogo versionado y diagnostique canales
históricos antes de habilitar la captura:

```powershell
python -m app.seeds.geography --diagnose-channels
```

La imagen Docker incluye `data/` y `scripts/`. Al iniciar el servicio `backend`
ejecuta primero las migraciones y este seed local idempotente, antes de arrancar
Uvicorn y el scheduler. El mismo diagnóstico queda registrado en sus logs:

```powershell
docker compose --env-file .env -f opsx/docker-compose.yml up --build -d
docker compose --env-file .env -f opsx/docker-compose.yml logs backend
```

La captura reconoce aliases locales con prioridad título → descripción y usa el
país del canal solo cuando no existe ninguna mención. No hay solicitudes
geográficas externas en runtime. Para clasificar el histórico por lotes:

```powershell
python scripts/backfill_geography.py --version 2026-10-27.v1 --batch-size 100
```

En un despliegue Docker, ejecute el backfill de forma explícita después de que
el backend esté saludable:

```powershell
docker compose --env-file .env -f opsx/docker-compose.yml exec backend python scripts/backfill_geography.py --version 2026-10-27.v2 --batch-size 100
```

El comando es reanudable e idempotente para la misma versión. Cambiar de versión
reemplaza las asociaciones, pero no modifica `valor_humor`, `fecha_analisis` ni
`NOTICIA_TERMINO`. Procedencia, licencias y limitaciones están en
`data/geography/README.md` y `manifest.json`.

## API de diccionario

Base: `/api/v1` · Swagger: `/api/docs` · OpenAPI JSON: `/api/openapi.json`.

| Metodo | Ruta | Proposito |
|---|---|---|
| `GET` | `/dictionary` | Listar todos los terminos o buscar por palabra mediante `q` |
| `GET` | `/dictionary/{term_id}` | Consultar un termino por identificador |
| `POST` | `/dictionary` | Crear un termino |
| `PUT` | `/dictionary/{term_id}` | Reemplazar todos los campos editables |
| `PATCH` | `/dictionary/{term_id}` | Actualizar uno o mas campos editables |
| `DELETE` | `/dictionary/{term_id}` | Desactivar logicamente un termino |

Las palabras se almacenan en minusculas, sin espacios exteriores y conservando
las tildes. Solo se admiten los idiomas `es` y `en`; la pareja formada por
palabra e idioma es unica. `valor` acepta cualquier decimal finito representable
por PostgreSQL, sin aplicar todavia el rango o la precision semantica que debera
definir ADR-001.

Ejemplo de alta:

```json
{
  "palabra": "alegría",
  "idioma": "es",
  "valor": "0.75"
}
```

`DELETE` conserva el registro con `activo=false`; repetir la operacion sobre un
termino ya inactivo tambien responde `204`. El listado incluye terminos activos
e inactivos y se ordena por palabra, idioma e identificador.

## API de configuracion

Base: `/api/v1` · Swagger: `/api/docs` · OpenAPI JSON: `/api/openapi.json`.

| Metodo | Ruta | Proposito |
|---|---|---|
| `GET` | `/config` | Consultar la configuracion runtime |
| `PUT` | `/config` | Actualizar la configuracion runtime |

`GET /api/v1/config` devuelve `captura_periodicidad_minutos` y
`noticias_caducidad_dias`. En una base migrada limpia, los valores por defecto
son `60` minutos para la captura y `30` dias para la caducidad de noticias.

```json
{
  "captura_periodicidad_minutos": 60,
  "noticias_caducidad_dias": 30
}
```

`PUT /api/v1/config` persiste enteros positivos para las claves internas
`captura.periodicidad_minutos` y `noticias.caducidad_dias`:

```json
{
  "captura_periodicidad_minutos": 30,
  "noticias_caducidad_dias": 45
}
```

Valores menores que `1`, campos ausentes o tipos incompatibles se rechazan con
respuesta `400` y no reemplazan los valores persistidos previamente.

Cuando el scheduler esta activo, cambiar `captura_periodicidad_minutos`
reprograma el job sin reiniciar el backend y sin lanzar una captura inmediata.

## Captura automatica de noticias

El backend inicia un unico job APScheduler que, al cumplirse la periodicidad
configurada, consulta todas las fuentes activas, descarga sus feeds y persiste
las noticias nuevas. La primera ejecucion ocurre despues del intervalo; el
arranque de la API no depende de los proveedores RSS.

La captura usa el `guid` publicado por el item y, si no existe, su `link`.
PostgreSQL garantiza la unicidad de `(id_fuente, guid_origen)`, por lo que
repetir un ciclo no duplica noticias. Una fuente fallida queda registrada en
los logs y no detiene las restantes. `fecha_ultima_captura` solo cambia cuando
el feed fue descargado y procesado correctamente.

El scheduler esta habilitado por defecto. Puede desactivarse, por ejemplo para
una ejecucion de pruebas que no evalua el cron:

```bash
CAPTURE_SCHEDULER_ENABLED=false
```

El scheduler vive dentro del proceso del backend. El despliegue actual debe
mantener una sola instancia de Uvicorn; multiples workers o replicas
necesitarian coordinacion externa para evitar cron duplicados.

### Captura manual

`POST /api/v1/sources/capture` ejecuta una captura inmediata. Sin cuerpo
procesa todas las fuentes activas; para limitarla, envie `source_ids`, por
ejemplo `{"source_ids":[1,3]}`. La respuesta incluye el detalle por fuente
(`inserted`, `duplicates`, `invalid`, `error`) y los totales de la ejecucion.
Las fuentes inactivas se omiten y los errores de una fuente no detienen a las
restantes. Los identificadores inexistentes responden `404`.

### Comprobacion manual en Docker

Desde la raiz del repositorio:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml up --build -d
docker compose --env-file .env -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
```

Configure temporalmente un minuto mediante `PUT /api/v1/config` y observe el
backend durante dos ciclos:

```bash
curl -X PUT http://localhost:3000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"captura_periodicidad_minutos":1,"noticias_caducidad_dias":30}'
docker compose --env-file .env -f opsx/docker-compose.yml logs -f backend
```

Compruebe las noticias, fechas y duplicados desde PostgreSQL:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml exec postgres psql -U humworld -d humworld -c "SELECT count(*) AS noticias, count(DISTINCT (id_fuente, guid_origen)) AS unicas FROM noticia;"
docker compose --env-file .env -f opsx/docker-compose.yml exec postgres psql -U humworld -d humworld -c "SELECT id_fuente, activa, fecha_ultima_captura FROM fuente_rss ORDER BY id_fuente;"
```

Después de la prueba puede restablecer la periodicidad a `60` mediante el mismo
`PUT`, conservando `noticias_caducidad_dias` con el valor que corresponda.

## Pruebas

Las pruebas unitarias no requieren base de datos:

```bash
pytest -m "not integration"
```

La suite completa exige PostgreSQL migrado y `DATABASE_URL`:

```bash
alembic upgrade head
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
```

Las pruebas de integracion usan PostgreSQL; SQLite no forma parte de la estrategia de pruebas.
