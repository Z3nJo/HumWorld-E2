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

La migracion inicial crea exclusivamente `canal` y `fuente_rss` conforme a MOD-01.

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
