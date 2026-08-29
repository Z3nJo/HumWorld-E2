# E1-H01 — Evidencia de validacion

Fecha: 28 de agosto de 2026.

## Entorno y migraciones

- `docker compose -f opsx/docker-compose.yml up -d --build` construyo y levanto backend, frontend y PostgreSQL 16.
- PostgreSQL alcanzo estado saludable y el backend ejecuto `alembic upgrade head` antes de iniciar Uvicorn.
- Se verifico la secuencia `upgrade head -> downgrade base -> upgrade head` sobre la base local de validacion.
- El esquema migrado contiene `canal` y `fuente_rss`; el downgrade retiro ambas tablas y conservo solamente `alembic_version`.

## Pruebas y cobertura

Comando equivalente al pipeline:

```bash
cd backend
alembic upgrade head
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
```

Resultado local:

- 26 pruebas aprobadas.
- 96,33 % de cobertura total reportada.
- Pruebas unitarias ejecutables sin PostgreSQL.
- Pruebas API-BD ejecutadas exclusivamente contra PostgreSQL mediante psycopg 3.

## Criterios funcionales

Sobre `http://localhost:3000/api/v1/sources` se comprobo:

1. Alta atomica de un canal con dos fuentes RSS.
2. Filtro combinado `continent=America&active=true`.
3. Persistencia de la fuente despues de reiniciar el contenedor backend.
4. `PATCH` de nombre y estado sin modificar `id_canal`.
5. `DELETE` con respuesta `204` y sin cuerpo.
6. Conservacion del canal al eliminar una fuente.
7. Limpieza posterior de todos los registros temporales de validacion.

## Swagger y contratos

- `/api/docs` respondio `200` y fue revisado visualmente.
- Swagger publica `POST`, `GET` de coleccion, `GET` de detalle, `PUT`, `PATCH` y `DELETE` bajo `/api/v1/sources`.
- El contrato documenta `200`, `201`, `204`, `400`, `404` y `500` segun cada operacion, sin publicar `422`.
- `python opsx/sync_contracts.py --check` confirmo que `opsx/contracts/` coincide con la fuente de `openspec/`.
- `openspec validate e1-h01-sources-crud --strict` finalizo correctamente.

La ejecucion definitiva de GitHub Actions y la revision cruzada deben adjuntarse al PR antes de declarar la historia terminada.
