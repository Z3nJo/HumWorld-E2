# Opsx

Esta carpeta contiene la configuracion operativa del proyecto.

Incluye el entorno Docker Compose con PostgreSQL 16, backend y frontend, ademas de la copia generada de los contratos OpenSpec entregables.

## Levantar el entorno

```bash
docker compose -f opsx/docker-compose.yml up --build
```

## Detener el entorno

```bash
docker compose -f opsx/docker-compose.yml down
```

El backend aplica las migraciones Alembic antes de iniciar Uvicorn. Swagger queda disponible en `http://localhost:3000/api/docs`.

## Contratos OpenSpec

La fuente editable permanece en `openspec/`. Para generar la copia entregable:

```bash
python opsx/sync_contracts.py
```

Para comprobar que la copia no se ha desactualizado:

```bash
python opsx/sync_contracts.py --check
```

Los archivos de `opsx/contracts/` son generados y no deben editarse manualmente.
