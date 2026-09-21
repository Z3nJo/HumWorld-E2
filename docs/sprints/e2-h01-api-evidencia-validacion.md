# Evidencia de validacion E2-H01-API

Fecha de validacion local: 2026-09-21.

## Alcance implementado

Se incorporo la vertical completa `api -> services -> repositories -> models`
para `/api/v1/dictionary`, con listado, busqueda parcial, detalle, creacion,
reemplazo, actualizacion parcial y desactivacion logica idempotente.

La implementacion normaliza la palabra mediante recorte exterior y minusculas,
conserva tildes, limita el idioma a `es`/`en` y mantiene unica la pareja
`(palabra, idioma)`. El valor se representa como decimal finito y no incorpora
un rango emocional ni precision semantica; esa decision permanece aplazada a
ADR-001.

## Pruebas unitarias y de contrato

Se ejecuto la suite sin integracion PostgreSQL con cobertura:

```text
pytest -m "not integration" --cov=app --cov-report=term-missing --cov-fail-under=80
71 passed, 29 deselected, 2 warnings in 2.50s
Total coverage: 82.43%
```

Las 25 pruebas focalizadas del cambio validaron servicio, modelo, endpoints y
OpenAPI:

```text
pytest tests/test_dictionary_api.py tests/test_openapi.py \
       tests/test_dictionary_service.py tests/test_term_model.py -q
25 passed, 1 warning in 1.37s
```

La advertencia corresponde a la obsolescencia conocida de `httpx` con
`starlette.testclient`; no produce fallos.

## Cobertura funcional automatizada

- normalizacion de espacios, mayusculas y tildes;
- unicidad normalizada por idioma y rollback ante conflictos;
- decimal finito sin rango emocional provisional;
- GET de lista, busqueda y detalle;
- POST `201`, PUT/PATCH `200` y DELETE `204`;
- PATCH no vacio y rechazo de valores `null`;
- eliminacion logica e idempotencia;
- errores de dominio `400`, ausencias `404` y contrato `500`;
- acceso sin autenticacion;
- schemas, ejemplos y codigos publicados en OpenAPI sin `422`.

Tambien se ejecutaron pruebas de integracion sobre PostgreSQL 16 que cubren el ciclo
de migracion downgrade/upgrade, restricciones fisicas, CRUD persistente tras
reiniciar el cliente, busqueda con mayusculas/tildes, comodines literales,
atomicidad y rollback del repositorio.

## PostgreSQL, migraciones y cobertura completa

El backend aplico en el contenedor la migracion nueva desde el head anterior:

```text
Running upgrade 20260901_01 -> 20260921_01, Create dictionary term table.
```

La prueba de migraciones verifico sobre PostgreSQL los recorridos
`base -> 20260901_01 -> head` y `head -> 20260901_01 -> head`. La tabla
`termino` desaparecio unicamente durante su downgrade y las tablas `canal`,
`fuente_rss`, `configuracion` y `noticia` se conservaron en el head anterior.

Suite completa equivalente a CI:

```text
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
100 passed, 7 warnings in 5.96s
Total coverage: 95.70%
```

No hubo pruebas omitidas. Las advertencias corresponden a la obsolescencia ya
conocida de TestClient, la configuracion heredada de Alembic y la imposibilidad
del sandbox de actualizar `.pytest_cache`; ninguna afecto los resultados.

## Validacion manual en Docker Compose

El entorno se construyo y levanto con PostgreSQL 16 y el backend migrado:

```text
docker compose -f opsx/docker-compose.yml up --build -d postgres backend
humworld-postgres  Up (healthy)
humworld-backend   Up
```

Se comprobo el recorrido completo sobre `/api/v1/dictionary`:

| Operacion | Resultado |
| --- | --- |
| POST `  Alegría  ` / `es` / `123.456789` | `201`; almaceno `alegría`, activo y sin perdida decimal |
| POST `ALEGRÍA` / `en` / `-4.125` | `201`; permitio la misma palabra en otro idioma |
| POST duplicado normalizado en `es` | `400` |
| GET lista | `200`; incluyo ambos terminos |
| GET con `q=ALEGRÍ` | `200`; encontro los dos terminos conservando la tilde |
| GET detalle | `200` con todos los campos y fechas |
| PUT a `serenidad` / `2.5` | `200`; conservo identificador y fecha de alta |
| PATCH de valor a `3.75` | `200`; conservo los demas campos |
| DELETE activo | `204`; dejo `activo=false` |
| DELETE nuevamente | `204`; operacion idempotente |

`GET /api/docs` respondio `200` y `/api/openapi.json` publico tanto la ruta de
coleccion como la de detalle. Tras reiniciar `humworld-backend`, el termino se
recupero con el mismo identificador, palabra, valor y estado. PostgreSQL confirmo:

```text
1|serenidad|es|3.75|false
2|alegría|en|-4.125|false
```

## OpenSpec y contratos

```text
openspec validate e2-h01-dictionary-api --strict
Change 'e2-h01-dictionary-api' is valid

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```
