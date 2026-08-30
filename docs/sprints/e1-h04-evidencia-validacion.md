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

## Pendiente en GitHub

- Confirmar validacion OpenSpec estricta cuando el CLI `openspec` este disponible.
- Confirmar el job de CI del PR.
- Obtener revision cruzada antes de cerrar E1-H04.
