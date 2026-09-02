# Backend

API REST de HumWorld desarrollada con Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic y PostgreSQL 16.

## Configuracion

La variable obligatoria `DATABASE_URL` admite tanto la URL generica de la infraestructura como el dialecto explicito de psycopg 3:

```bash
DATABASE_URL=postgresql://humworld:humworld@localhost:5432/humworld
```

El backend normaliza internamente `postgresql://` a `postgresql+psycopg://`. Puede copiarse `.env.example` como `.env` para desarrollo local.

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

Las migraciones crean las tablas del backend implementadas hasta el momento conforme a MOD-01, incluyendo `canal`, `fuente_rss`, `configuracion` y `noticia`.

## Carga inicial de fuentes RSS

Despues de aplicar las migraciones, ejecute el seed versionado desde `backend/`:

```bash
alembic upgrade head
python -m app.seeds.sources
```

El comando registra seis canales y seis fuentes RSS activas, una para cada
continente admitido: `Africa`, `America`, `Antartida`, `Asia`, `Europa` y
`Oceania`. No descarga ni valida remotamente los feeds.

El seed es idempotente: puede ejecutarse nuevamente sin duplicar registros. Si
encuentra un canal o una URL con datos incompatibles, revierte la ejecucion
completa y muestra el conflicto en lugar de sobrescribir los datos existentes.

## API de fuentes RSS

Base: `/api/v1` · Swagger: `/api/docs` · OpenAPI JSON: `/api/openapi.json`.

| Metodo | Ruta | Proposito |
|---|---|---|
| `POST` | `/sources` | Crear un canal con una o mas fuentes, o agregarlas a un canal existente |
| `GET` | `/sources` | Listar y filtrar por `continent` y `active` |
| `GET` | `/sources/{source_id}` | Consultar una fuente |
| `PUT` | `/sources/{source_id}` | Reemplazar los campos editables |
| `PATCH` | `/sources/{source_id}` | Actualizar parcialmente los campos editables |
| `DELETE` | `/sources/{source_id}` | Eliminar una fuente conservando su canal |

Ejemplo de alta:

```json
{
  "channel": {
    "nombre": "Agencia Mundo",
    "continente": "America"
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

Para un canal existente, sustituya `channel` por `"channel_id": 1`. `PUT` y `PATCH` no permiten modificar `id_canal`.

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
docker compose -f opsx/docker-compose.yml up --build -d
docker compose -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
```

Configure temporalmente un minuto mediante `PUT /api/v1/config` y observe el
backend durante dos ciclos:

```bash
curl -X PUT http://localhost:3000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"captura_periodicidad_minutos":1,"noticias_caducidad_dias":30}'
docker compose -f opsx/docker-compose.yml logs -f backend
```

Compruebe las noticias, fechas y duplicados desde PostgreSQL:

```bash
docker compose -f opsx/docker-compose.yml exec postgres psql -U humworld -d humworld -c "SELECT count(*) AS noticias, count(DISTINCT (id_fuente, guid_origen)) AS unicas FROM noticia;"
docker compose -f opsx/docker-compose.yml exec postgres psql -U humworld -d humworld -c "SELECT id_fuente, activa, fecha_ultima_captura FROM fuente_rss ORDER BY id_fuente;"
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
