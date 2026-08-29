# Evidencia de validacion E1-H02

Fecha de validacion local: 2026-08-29.

## Seed reproducible

Con PostgreSQL 16 saludable y `DATABASE_URL` configurada:

```text
alembic upgrade head
python -m app.seeds.sources
Seed de fuentes RSS completado: 6 canales creados, 6 fuentes creadas, 0 fuentes existentes.

python -m app.seeds.sources
Seed de fuentes RSS completado: 0 canales creados, 0 fuentes creadas, 6 fuentes existentes.
```

La prueba de integracion adicional confirma rollback completo ante una colision
incompatible y no realiza solicitudes a los proveedores RSS.

## Pruebas y cobertura

Comando equivalente al utilizado por CI:

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
36 passed
Total coverage: 96.01%
```

## OpenSpec

```text
openspec validate e1-h02-seed-rss-continents --strict
Change 'e1-h02-seed-rss-continents' is valid
```

## Docker Compose

```text
docker compose -f opsx/docker-compose.yml config --quiet
docker compose -f opsx/docker-compose.yml build
```

Ambos comandos finalizaron con codigo 0 y se construyeron las imagenes de
backend y frontend.

## Pendiente en GitHub

- Confirmar el job de CI del PR.
- Obtener revision cruzada antes de cerrar E1-H02.
