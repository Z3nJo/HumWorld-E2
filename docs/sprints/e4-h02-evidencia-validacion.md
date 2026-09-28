# Evidencia de validacion E4-H02

Fecha de revalidacion local: 2026-09-28, sobre `main` en `52349a6` (Docker Compose y
PostgreSQL 16). La historia se integro con los PR #39 a #41; el ultimo se fusiono el 2026-09-25.

## Alcance implementado

Se implemento el servicio de purgado automatico de noticias caducadas (`NewsPurgeService`)
y su repositorio (`NewsPurgeRepository`), coordinado periodicamente por el scheduler de la aplicacion:

- **Criterio de caducidad temporal:** elimina fisicamente noticias cuya `fecha_registro` sea
  estrictamente anterior a `ahora - noticias.caducidad_dias`, resolviendo el parametro vigente
  desde la tabla `configuracion`. Las noticias cuyo registro coincida exactamente con el umbral
  o sea posterior se conservan.
- **Eliminacion integra en cascada:** al eliminar cada noticia caducada, sus filas dependientes
  en `NOTICIA_TERMINO` se eliminan automaticamente mediante la restriccion de clave foranea
  con borrado en cascada (`ON DELETE CASCADE`), evitando registros huerfanos.
- **Aislamiento absoluto:** el purgado no afecta canales, fuentes RSS, terminos del diccionario
  ni parametros de configuracion.
- **Ejecucion coordinada con APScheduler:** el job `news-purging` (`PURGE_JOB_ID`) se programa
  con el mismo intervalo de `captura.periodicidad_minutos`.
- **Reprogramacion en caliente:** cuando se actualiza la periodicidad de captura via
  `PUT /api/v1/config`, tanto el job de captura como el de purgado se reprograman de forma
  dinamica con el nuevo intervalo sin reiniciar el servicio ni disparar purgados prematuros.
- **Robustez transaccional:** cualquier excepcion durante el purgado revierte la transaccion
  mediante `session.rollback()` y se registra en logs sin dejar inconsistencias en la base de datos.

## Pruebas automatizadas

Se ejecuto la suite de pruebas del scheduler y purgado desde `backend/`:

```text
pytest tests/test_scheduler.py tests/test_news_purge_service.py tests/test_news_purge_postgresql.py -q
11 passed, 1 warning in 0.80s
```

La suite certifica:

- programacion conjunta de captura y purgado al iniciar el scheduler;
- reprogramacion dinamica de ambos jobs con nuevo intervalo;
- ausencia de ejecucion inmediata al programar o reprogramar;
- lectura dinamica de `noticias.caducidad_dias` y registro del conteo de noticias eliminadas;
- rollback de sesion y registro de excepcion ante fallos en la persistencia.

## Integracion con PostgreSQL

Se verifico contra PostgreSQL 16, en el entorno Docker Compose con `noticias.caducidad_dias = 30`,
la eliminacion fisica y el borrado en cascada. Se insertaron una noticia caducada (35 dias) y
una reciente (5 dias), cada una con su fila en `noticia_termino`. El identificador se obtiene con
`RETURNING` porque depende de las capturas previas en la misma base:

```text
humworld=# INSERT INTO noticia (id_fuente, guid_origen, titulo, url, idioma, fecha_registro, fecha_analisis, valor_humor)
VALUES (1, 'guid-antiguo', 'Noticia caducada', 'http://example.com/old', 'es', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', 0.800)
RETURNING id_noticia;
 id_noticia
------------
        901
(1 row)

humworld=# INSERT INTO noticia_termino (id_noticia, id_termino, ocurrencias, aporte_humor)
VALUES (currval('noticia_id_noticia_seq'), 1, 1, 8.00)
RETURNING id_noticia;
 id_noticia
------------
        901
(1 row)

-- Mismo par de INSERT con guid 'guid-reciente', 'Noticia reciente' e INTERVAL '5 days': id_noticia = 902

humworld=# SELECT id_noticia, count(*) FROM noticia_termino WHERE id_noticia IN (901, 902) GROUP BY id_noticia ORDER BY id_noticia;
 id_noticia | count
------------+-------
        901 |     1
        902 |     1
(2 rows)
```

Luego se redujo la periodicidad a 1 minuto con `PUT /api/v1/config` (respuesta `200 OK`,
`{"captura_periodicidad_minutos":1,"noticias_caducidad_dias":30}`) y se espero la siguiente
ejecucion programada del job `news-purging`, sin reiniciar el backend:

```text
humworld=# SELECT id_noticia, guid_origen FROM noticia WHERE guid_origen IN ('guid-antiguo', 'guid-reciente') ORDER BY id_noticia;
 id_noticia |  guid_origen
------------+---------------
        902 | guid-reciente
(1 row)

humworld=# SELECT id_noticia, count(*) FROM noticia_termino WHERE id_noticia IN (901, 902) GROUP BY id_noticia ORDER BY id_noticia;
 id_noticia | count
------------+-------
        902 |     1
(1 row)
```

La noticia 901 (35 dias) y su fila de `noticia_termino` fueron eliminadas; la noticia 902
(5 dias) y su desglose permanecieron intactos.

## Validacion en Docker Compose

La reprogramacion en caliente se observo en la base de datos: tras el `PUT` de las 14:40:46 UTC,
el job de captura registro noticias nuevas a las 14:41:49 UTC y el job de purgado elimino la
noticia caducada, sin reiniciar el contenedor `humworld-backend`.

**No reproducido:** los mensajes `RSS capture completed` y `News purge completed` que emite
`app.scheduler` no aparecen en `docker logs humworld-backend`, porque el backend no configura un
handler de logging para los loggers de la aplicacion y solo se ven las lineas de Alembic y
Uvicorn. Por eso esta evidencia no incluye lineas de log del scheduler.

## OpenSpec y contratos

```text
openspec validate e4-h02-news-purging --strict
Change 'e4-h02-news-purging' is valid

openspec validate news-purging --strict
Specification 'news-purging' is valid

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```
