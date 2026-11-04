# Opsx

Esta carpeta contiene la configuracion operativa del proyecto.

Incluye el entorno Docker Compose con PostgreSQL 16, backend y frontend, ademas de la copia generada de los contratos OpenSpec entregables.

## Levantar el entorno

Desde la raíz del repositorio, con `.env` creado a partir de `.env.example` (ver `docs/operations/postgresql-credentials.md`):

```bash
docker compose --env-file .env -f opsx/docker-compose.yml up --build
```

Los canales y fuentes RSS se siembran a mano tras el primer arranque:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
```

## Detener el entorno

```bash
docker compose --env-file .env -f opsx/docker-compose.yml down
```

El backend aplica las migraciones Alembic antes de iniciar Uvicorn. Swagger queda disponible en `http://localhost:3000/api/docs`.

## Contratos OpenSpec

La única fuente editable del repositorio permanece en `openspec/`, incluida la documentación OpenSpec del frontend bajo `openspec/specs/frontend/`. No se deben crear raíces OpenSpec dentro de `frontend/` u otros subdirectorios. La copia entregable incluye todas las `spec.md` de `openspec/specs/`, con la misma estructura de carpetas. Para generarla:

```bash
python opsx/sync_contracts.py
```

Para comprobar que la copia no se ha desactualizado:

```bash
python opsx/sync_contracts.py --check
```

Los archivos de `opsx/contracts/` son generados y no deben editarse manualmente.
