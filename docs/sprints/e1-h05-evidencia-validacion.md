# Evidencia de validacion E1-H05

Fecha de validacion local: 2026-09-05.

## Entorno

La validacion se ejecuto sobre PostgreSQL 16.15 y Python 3.12.14 nativos, con la misma
version de motor y de interprete que declaran `opsx/docker-compose.yml` y el pipeline de CI.
No se utilizo Docker Compose porque la maquina de validacion no tiene habilitada la
integracion de Docker Desktop con WSL 2; la comprobacion equivalente sobre el entorno
contenerizado queda pendiente de adjuntarse al PR.

```text
PostgreSQL 16.15 (Homebrew) on x86_64-pc-linux-gnu
Python 3.12.14
DATABASE_URL=postgresql://humworld:humworld@127.0.0.1:5432/humworld
CAPTURE_SCHEDULER_ENABLED=false
```

El scheduler se deshabilito de forma deliberada para que toda captura observada proviniera
del endpoint manual y no del cron de E1-H03.

## Migraciones

La cadena completa se aplico sobre una base limpia y se verifico el ciclo
`upgrade head -> downgrade base -> upgrade head`:

```text
Running upgrade  -> 20260828_01, Create channel and RSS source tables.
Running upgrade 20260828_01 -> 20260830_01, Create configuration table.
Running upgrade 20260830_01 -> 20260901_01, Create news table for automatic RSS capture.
```

El esquema resultante contiene `alembic_version`, `canal`, `configuracion`, `fuente_rss` y
`noticia`. E1-H05 no introduce migraciones nuevas.

## Pruebas y cobertura

Comando equivalente al utilizado por CI:

```text
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
78 passed in 2.72s
Required test coverage of 80% reached. Total coverage: 97.01%
```

Las pruebas API-BD se ejecutaron contra PostgreSQL real; no hubo pruebas omitidas.
`app/services/capture.py` alcanzo 98 % y `app/api/sources.py` 96 %.

## Datos de partida

El seed versionado de E1-H02 se aplico sobre la base limpia:

```text
Seed de fuentes RSS completado: 6 canales creados, 6 fuentes creadas, 0 fuentes existentes.
```

| id_fuente | Continente | Fuente |
| ---: | --- | --- |
| 1 | Africa | Africanews Latest News |
| 2 | America | CBC News Top Stories |
| 3 | Antartida | USAP News |
| 4 | Asia | CNA Asia |
| 5 | Europa | DW English |
| 6 | Oceania | ABC News Top Stories |

## Criterios funcionales

Sobre `POST /api/v1/sources/capture` se comprobo:

### 1. Captura inmediata de todas las fuentes activas

```json
{"inserted": 865, "failed_sources": 1, "skipped_source_ids": [],
 "sources": [{"source_id": 1, "inserted": 50,  "duplicates": 0,  "invalid": 0, "error": null},
             {"source_id": 2, "inserted": 0,   "duplicates": 0,  "invalid": 0, "error": "No fue posible descargar el feed: https://www.cbc.ca/cmlink/rss-topstories"},
             {"source_id": 3, "inserted": 635, "duplicates": 19, "invalid": 0, "error": null},
             {"source_id": 4, "inserted": 20,  "duplicates": 0,  "invalid": 0, "error": null},
             {"source_id": 5, "inserted": 135, "duplicates": 0,  "invalid": 0, "error": null},
             {"source_id": 6, "inserted": 25,  "duplicates": 0,  "invalid": 0, "error": null}]}
```

La respuesta es `200` e incluye resumen por fuente y totales de la ejecucion.

### 2. Aislamiento de errores

La fuente 2 (CBC) fallo en la descarga del feed y reporto su error en el elemento
correspondiente sin interrumpir el recorrido: las otras cinco fuentes completaron la captura
y `failed_sources` quedo en `1`.

La fuente 3 declaro 19 duplicados en el propio ciclo inicial, porque su feed publica
identificadores repetidos dentro de la misma respuesta. La deduplicacion opera tanto entre
ejecuciones como dentro de una misma ejecucion.

### 3. Idempotencia entre ejecuciones

Una segunda invocacion inmediata, sin cambios en los feeds, no inserto ninguna noticia:

```json
{"inserted": 0, "failed_sources": 1, "skipped_source_ids": [],
 "sources": [{"source_id": 1, "inserted": 0, "duplicates": 50,  "invalid": 0, "error": null},
             {"source_id": 2, "inserted": 0, "duplicates": 0,   "invalid": 0, "error": "No fue posible descargar el feed: https://www.cbc.ca/cmlink/rss-topstories"},
             {"source_id": 3, "inserted": 0, "duplicates": 654, "invalid": 0, "error": null},
             {"source_id": 4, "inserted": 0, "duplicates": 20,  "invalid": 0, "error": null},
             {"source_id": 5, "inserted": 0, "duplicates": 135, "invalid": 0, "error": null},
             {"source_id": 6, "inserted": 0, "duplicates": 25,  "invalid": 0, "error": null}]}
```

Los 654 duplicados de la fuente 3 corresponden a las 635 noticias insertadas mas los 19
duplicados internos del feed, lo que confirma que el segundo ciclo reproceso exactamente el
mismo conjunto de items.

### 4. Seleccion explicita de fuentes

`{"source_ids": [1]}` proceso unicamente la fuente 1 y devolvio `inserted: 0`,
`duplicates: 50`, sin tocar el resto del catalogo.

### 5. Fuentes inactivas

Tras `PATCH /api/v1/sources/6` con `activa: false`:

- `{"source_ids": [6]}` respondio `200` con `sources: []` y `skipped_source_ids: [6]`, es
  decir, la fuente se reporta como omitida y no como error.
- La captura sin seleccion recorrio solo las cinco fuentes activas restantes.

La fuente 6 se restauro a `activa: true` al terminar la comprobacion.

### 6. Codigos de error

| Caso | Respuesta |
| --- | --- |
| `{"source_ids": [9999]}` | `404` con `{"detail": "Fuentes RSS no encontradas: 9999"}` |
| `{"source_ids": []}` | `400`, la lista debe contener al menos un elemento |

## Verificacion en base de datos

```text
 noticias_totales | claves_unicas | sin_humor | con_fecha_registro
------------------+---------------+-----------+--------------------
              865 |           865 |       865 |                865
```

El total coincide con la cantidad de claves unicas `(id_fuente, guid_origen)`, lo que
confirma la ausencia de duplicados persistidos. Las 865 noticias conservan `valor_humor` y
`fecha_analisis` nulos, a la espera de E2-H02.

`fecha_ultima_captura` quedo poblada en las cinco fuentes procesadas correctamente y nula en
la fuente 2, que no completo ninguna descarga.

## Configuracion runtime

`GET /api/v1/config` sobre base limpia devolvio los valores por defecto y el ciclo de
actualizacion se comporto segun contrato:

| Operacion | Resultado |
| --- | --- |
| `GET /config` (base limpia) | `200` con `60` y `30` |
| `PUT /config` con `15` / `45` | `200`, valores persistidos y recuperados por `GET` |
| `PUT /config` con periodicidad `0` | `400`, sin alterar los valores persistidos |
| `PUT /config` con caducidad `0` | `400`, sin alterar los valores persistidos |
| `PUT /config` restaurando `60` / `30` | `200` |

La tabla `configuracion` conserva las claves `captura.periodicidad_minutos` y
`noticias.caducidad_dias`, ambas de tipo `entero` y con `fecha_modificacion` registrada.

## Swagger y contratos

`GET /api/openapi.json` publica nueve operaciones y ninguna declara `422`:

```text
GET     /api/v1/config               200, 400, 500
PUT     /api/v1/config               200, 400, 500
POST    /api/v1/sources              201, 400, 404, 500
GET     /api/v1/sources              200, 400, 404, 500
POST    /api/v1/sources/capture      200, 400, 404, 500
GET     /api/v1/sources/{source_id}  200, 400, 404, 500
PUT     /api/v1/sources/{source_id}  200, 400, 404, 500
PATCH   /api/v1/sources/{source_id}  200, 400, 404, 500
DELETE  /api/v1/sources/{source_id}  204, 400, 404, 500
```

Validacion de los contratos OpenSpec y de su copia entregable:

```text
openspec validate --all --strict
Totals: 5 passed, 0 failed (5 items)

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```

## Alcance

E1-H05 agrega unicamente `POST /api/v1/sources/capture`. No modifica la periodicidad ni el
comportamiento del scheduler, no incorpora autenticacion, historial de ejecuciones ni
procesamiento asincrono, y no altera el modelo de noticias.

La ejecucion definitiva de GitHub Actions y la revision cruzada deben adjuntarse al PR antes
de declarar la historia terminada.

## Validacion Docker posterior al cierre

Fecha de validacion: 16 de septiembre de 2026.

La comprobacion pendiente se repitio sobre un entorno Docker Compose aislado construido
desde el estado cerrado del Sprint 1. Se uso un override temporal unicamente para asignar
nombres distintos a los contenedores y no reutilizar los contenedores ni el volumen local de
una ejecucion anterior. No se modifico codigo de aplicacion.

El entorno quedo compuesto por Python 3.12.14 y PostgreSQL 16.15. El backend aplico la cadena
completa de migraciones hasta `20260901_01` y el seed creo seis canales y seis fuentes sobre
una base limpia.

### Captura manual y persistencia

La primera llamada a `POST /api/v1/sources/capture` respondio `200` y produjo:

| Fuente | Insertadas | Duplicadas | Resultado |
| ---: | ---: | ---: | --- |
| 1 | 50 | 0 | Correcto |
| 2 | 0 | 0 | Fallo aislado de descarga de CBC |
| 3 | 635 | 19 | Correcto |
| 4 | 20 | 0 | Correcto |
| 5 | 141 | 0 | Correcto |
| 6 | 25 | 0 | Correcto |

El total fue de 871 noticias insertadas y una fuente fallida. PostgreSQL confirmo 871
registros y 871 claves unicas `(id_fuente, guid_origen)`, todos con `fecha_registro` y con
`valor_humor` nulo. Las cinco fuentes procesadas correctamente actualizaron
`fecha_ultima_captura`; CBC la mantuvo sin valor.

Una segunda captura inmediata respondio `200`, inserto cero noticias y conservo los 871
registros unicos. Esto confirma la deduplicacion dentro del entorno Docker.

Tambien se verificaron los escenarios complementarios:

- seleccion explicita de la fuente 1: `200`, sin procesar otras fuentes;
- fuente 6 inactiva: `200`, informada en `skipped_source_ids`, y restaurada al finalizar;
- fuente inexistente `9999`: `404`, sin captura parcial;
- lista `source_ids` vacia: `400`;
- `/api/openapi.json`: nueve operaciones publicadas.

### Suite automatizada en Docker

La suite completa se ejecuto dentro de una instancia del contenedor backend contra una base
PostgreSQL separada del escenario funcional:

```text
pytest --cov=app --cov-report=term-missing --cov-fail-under=80 -p no:cacheprovider
78 passed in 5.07s
Total coverage: 95.07%
```

La ejecucion emitio una advertencia de obsolescencia de `starlette.testclient` respecto de
`httpx`, sin pruebas fallidas ni omitidas.

**Resultado:** la validacion Docker pendiente de E1-H05 queda completada. La inaccesibilidad
de CBC permanece como observacion independiente y no impidio procesar las otras cinco
fuentes. Los contenedores, la red y el volumen temporales se eliminaron al finalizar.
