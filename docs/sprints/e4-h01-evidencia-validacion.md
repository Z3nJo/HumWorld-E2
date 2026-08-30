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

## Pendiente en GitHub

- Confirmar validacion OpenSpec estricta cuando el CLI `openspec` este disponible.
- Confirmar el job de CI del PR.
- Obtener revision cruzada antes de cerrar E4-H01.
