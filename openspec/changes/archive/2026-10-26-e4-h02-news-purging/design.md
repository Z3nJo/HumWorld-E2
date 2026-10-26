## Context

La captura ya usa APScheduler y un servicio de configuración para obtener `captura.periodicidad_minutos`; E4-H01 dejó disponible `noticias.caducidad_dias`. `NOTICIA.fecha_registro` está indexada y `NOTICIA_TERMINO.id_noticia` tiene una FK con borrado en cascada. Ver `proposal.md` y `specs/news-purging/spec.md` para la motivación y el contrato.

## Goals / Non-Goals

**Goals:**

- Mantener la regla temporal en un servicio de dominio aislable mediante reloj y repositorio sustituibles.
- Ejecutar una eliminación masiva indexable desde la capa de repositorio dentro de una transacción.
- Coordinar el job de purgado con el scheduler y la reprogramación runtime ya existentes.
- Probar el dominio sin PostgreSQL y comprobar la eliminación física y la cascada contra PostgreSQL.

**Non-Goals:**

- Exponer acciones HTTP, auditoría, recuperación de noticias o soft delete.
- Introducir una tabla, migración o parámetro para el purgado.
- Modificar los contratos públicos de `/config`, captura, diccionario o sentimiento.

## Decisions

### Servicio de purgado con reloj inyectable

`NewsPurgeService` recibirá un repositorio de purgado y un reloj UTC opcional. Calculará el umbral como `clock() - timedelta(days=retention_days)` y solicitará al repositorio borrar noticias con `fecha_registro < umbral`; devolverá la cantidad eliminada. La lectura y validación de la caducidad se hará mediante `ConfigurationService` en el caso de uso programado, antes de invocar el servicio.

Esto mantiene la regla de negocio sin SQL y permite cubrir el límite estricto, el valor actualizado y los errores de configuración con pruebas unitarias. Se descarta calcular el umbral dentro del repositorio porque ocultaría la regla de negocio y obligaría a probarla con base de datos.

### Repositorio especializado y borrado físico en una sentencia

`NewsPurgeRepository` encapsulará una sentencia `DELETE` sobre `noticia` filtrada por `fecha_registro < umbral`, seguida de `commit` o `rollback` a través de su unidad de trabajo. PostgreSQL aplicará la cascada ya declarada hacia `noticia_termino`.

La eliminación única aprovecha el índice existente de `fecha_registro`, preserva la atomicidad de la operación y no carga entidades en memoria. Se descarta recorrer noticias individualmente porque aumenta el coste y podría dejar resultados parciales si falla a mitad del proceso.

### Dos jobs bajo el scheduler runtime existente

El scheduler actual conservará su ciclo de vida y añadirá un identificador de job para purgado. En `start(interval)` registrará captura y purgado con el mismo intervalo, `max_instances=1` y `coalesce=True`; en `reschedule(interval)` actualizará ambos. El job de purgado abrirá su propia sesión, resolverá la configuración vigente, ejecutará el servicio y registrará la cantidad eliminada. Un fallo hará rollback y se registrará sin detener futuros ciclos del scheduler.

Se descarta un scheduler independiente o una periodicidad nueva: duplicaría ciclo de vida y configuración sin que el criterio de E4-H02 lo requiera. La actualización de `PUT /config` seguirá invocando la misma operación de reprogramación, que ahora afecta a ambos jobs internamente.

### Pruebas por capa

Las pruebas unitarias usarán repositorio y reloj falsos para verificar el umbral, el operador estricto y la cantidad informada sin base de datos. Las pruebas del scheduler comprobarán la creación, reprogramación y apagado de ambos jobs sin ejecución inmediata. Una prueba de integración PostgreSQL insertará noticias vencidas, vigentes y exactamente en el umbral, además de un aporte `NOTICIA_TERMINO`, y confirmará la eliminación esperada y la conservación de entidades no afectadas.

## Risks / Trade-offs

- [Volumen alto de noticias vencidas] → usar un `DELETE` filtrado y el índice existente; si el volumen exige lotes o métricas, se evaluará en una historia posterior sin cambiar la regla de retención.
- [Caducidad corrupta en la base] → reutilizar la validación de `ConfigurationService`; el job revierte y registra el error sin borrar datos con un umbral inválido.
- [Fallo durante el purgado] → transacción única y rollback; la próxima ejecución puede reintentar las noticias que sigan vencidas.
- [Captura y purgado coinciden temporalmente] → cada job limita sus propias instancias y trabaja en transacciones independientes; la retención se decide exclusivamente por `fecha_registro`.

## Migration Plan

1. Incorporar el servicio, repositorio y job de purgado sin migraciones de esquema.
2. Activar ambos jobs desde el scheduler existente con la periodicidad ya configurada.
3. Desplegar con el valor de caducidad actual; el primer ciclo elimina solo registros estrictamente anteriores al umbral.

Rollback: revertir el cambio de aplicación. Las noticias ya eliminadas físicamente no se pueden recuperar desde el sistema; se requeriría una restauración externa de la base de datos si fuese necesaria.
