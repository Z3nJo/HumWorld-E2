# Evidencia de validacion E1-H03

Fecha de validacion local: 2026-09-01.

## Migraciones

La migracion `20260901_01` se aplico correctamente sobre el esquema local
existente y sobre una base PostgreSQL 16 temporal limpia:

```text
Running upgrade 20260830_01 -> 20260901_01, Create news table for automatic RSS capture.
```

La base limpia recorrio la cadena completa `20260828_01`, `20260830_01` y
`20260901_01`. La base temporal se elimino despues de la comprobacion.

## Pruebas y cobertura

Comando equivalente al utilizado por CI:

```text
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
73 passed
Total coverage: 94.93%
```

La suite incluye pruebas sin red real para descarga y normalizacion RSS,
aislamiento de fuentes, fallback `guid` a `link`, entradas invalidas,
reprogramacion del scheduler y ausencia de ejecucion inmediata. Las pruebas
PostgreSQL verifican idempotencia, `fecha_registro`,
`fecha_ultima_captura`, rollback y borrado en cascada.

## Validacion funcional Docker

El entorno completo se construyo y levanto correctamente con:

```text
docker compose -f opsx/docker-compose.yml up --build -d
```

Se ejecutaron las seis fuentes versionadas de E1-H02 con periodicidad temporal
de un minuto. El primer ciclo produjo:

```text
noticias = 867
claves unicas (id_fuente, guid_origen) = 867
```

El segundo ciclo produjo:

```text
noticias = 868
claves unicas (id_fuente, guid_origen) = 868
```

El feed incorporo una noticia nueva entre ambos ciclos; en los dos resultados
el total coincidio con la cantidad de claves unicas, confirmando que los items
anteriores no se duplicaron. Las 868 noticias conservaron `valor_humor` y
`fecha_analisis` nulos, listas para E2-H02.

Cinco fuentes actualizaron `fecha_ultima_captura` en ambos ciclos. La fuente
CBC (`id_fuente = 2`) fallo por descarga, conservo la fecha nula y no impidio
que las otras cinco fuentes finalizaran. El backend registro:

```text
RSS capture failed for source 2 (https://www.cbc.ca/cmlink/rss-topstories):
No fue posible descargar el feed
```

Al finalizar la validacion, la periodicidad se restablecio a `60` minutos.

La comprobacion cubrio:

- scheduler activo sin captura durante el arranque;
- recorrido de las fuentes activas y continuidad ante feeds fallidos;
- noticias con `fecha_registro` y sentimiento pendiente (`NULL`);
- `fecha_ultima_captura` solo para fuentes procesadas correctamente;
- igualdad entre el total y la unicidad `(id_fuente, guid_origen)` despues de ambos ciclos.

## Contrato y alcance

E1-H03 no agrega endpoints. `/api/docs` conserva `/api/v1/config` y el `PUT`
mantiene su cuerpo JSON, agregando la reprogramacion runtime del job. No se
implementaron captura manual, `/news`, sentimiento, purgado ni dashboards.

El documento `/api/openapi.json` se consulto sobre el contenedor en ejecucion y
solo publico `/api/v1/config` y las operaciones existentes de `/api/v1/sources`.

## OpenSpec

```text
openspec validate e1-h03-cron-news-capture --strict
Change 'e1-h03-cron-news-capture' is valid
```
