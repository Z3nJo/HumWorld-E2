# Evidencia de validacion E1-H04

Fecha de validacion local: 2026-08-30.

## Migraciones

Con PostgreSQL 16 disponible y `DATABASE_URL` configurada:

```text
alembic upgrade head
Running upgrade 20260828_01 -> 20260830_01, Create configuration table.

alembic downgrade 20260828_01
Running downgrade 20260830_01 -> 20260828_01, Create configuration table.

alembic upgrade head
Running upgrade 20260828_01 -> 20260830_01, Create configuration table.
```

## Pruebas y cobertura

Comando equivalente al usado por CI:

```text
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
51 passed
Total coverage: 94.47%
```

## Docker Compose

```text
docker compose -f opsx/docker-compose.yml config --quiet
docker compose -f opsx/docker-compose.yml build
```

Ambos comandos finalizaron con codigo 0 y se construyeron las imagenes de
backend y frontend.

## Confirmacion en GitHub

- PR #8 fusionado el 2026-08-30.
- Revision cruzada aprobada.
- Job de CI `docker-compose-check` finalizado correctamente.

## Nota OpenSpec

El CLI `openspec` no estuvo disponible en la terminal local de esta sesion. La
estructura del change fue mantenida manualmente siguiendo el workflow
`spec-driven`, y el contrato entregable quedo sincronizado mediante
`opsx/sync_contracts.py --check`.
