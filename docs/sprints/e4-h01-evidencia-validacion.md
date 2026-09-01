# Evidencia de validacion E4-H01

Fecha de validacion local: 2026-08-30.

## Alcance

E4-H01 extiende `/api/v1/config` con el parametro
`noticias.caducidad_dias`, expuesto como `noticias_caducidad_dias`.

No agrega endpoints, tablas ni migraciones nuevas; reutiliza la tabla
`configuracion` creada por E1-H04.

## Pruebas y cobertura

Comando equivalente al usado por CI:

```text
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
56 passed
Total coverage: 94.73%
```

## Docker Compose

```text
docker compose -f opsx/docker-compose.yml config --quiet
docker compose -f opsx/docker-compose.yml build
```

Ambos comandos finalizaron con codigo 0 y se construyeron las imagenes de
backend y frontend.

## Confirmacion en GitHub

- PR #9 fusionado el 2026-08-31.
- Revision cruzada aprobada.
- Job de CI `docker-compose-check` finalizado correctamente.

## Nota OpenSpec

El CLI `openspec` no estuvo disponible en la terminal local de esta sesion. La
estructura del change fue mantenida manualmente siguiendo el workflow
`spec-driven`, y el contrato entregable quedo sincronizado mediante
`opsx/sync_contracts.py --check`.
