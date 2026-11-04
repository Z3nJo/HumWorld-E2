## Context

E4-H02 dejó implementados `NewsPurgeService`, `NewsPurgeRepository` y el job programado. El servicio calcula en UTC el umbral estricto, el repositorio ejecuta un borrado masivo y PostgreSQL aplica la cascada hacia `NOTICIA_TERMINO`. Sin embargo, la lectura de `noticias.caducidad_dias` y la construcción del servicio están alojadas directamente en `run_purge_job()`, por lo que añadir el endpoint sin reorganizar esa orquestación duplicaría el caso de uso. Ver `proposal.md` y `specs/news-purging/spec.md` para la motivación y el contrato observable.

## Goals / Non-Goals

**Goals:**

- Exponer el purgado manual mediante un adaptador HTTP delgado y coherente con los routers FastAPI existentes.
- Compartir entre scheduler y API la resolución de la caducidad vigente y la invocación del purgado.
- Mantener la eliminación masiva, el umbral UTC, la transacción y la cantidad eliminada disponibles para observabilidad interna.
- Verificar el contrato HTTP y el comportamiento real contra PostgreSQL.

**Non-Goals:**

- Incorporar UI, autenticación, filtros de fecha, selección individual de noticias o una caducidad enviada por el cliente.
- Modificar el scheduler, el modelo de datos, la configuración runtime o la regla de retención.
- Añadir soft delete, recuperación, auditoría persistente o migraciones.

## Decisions

### Orquestación compartida en la capa de servicios

Se extraerá de `run_purge_job()` una operación de servicio que reciba las dependencias de configuración y purgado, obtenga `noticias_caducidad_dias` en el momento de la ejecución e invoque `NewsPurgeService.purge_expired()`. La operación devolverá la cantidad eliminada para que el scheduler conserve su log; el endpoint podrá ignorar esa cantidad porque su contrato es `204`.

El job programado y el nuevo endpoint construirán esta misma operación con repositorios asociados a su propia sesión. Así, la API no calcula umbrales ni conoce detalles de persistencia. Se descarta duplicar la secuencia en el router porque permitiría que los flujos automático y manual diverjan. También se descarta invocar `run_purge_job()` desde la API: esa función absorbe errores para proteger al scheduler y no puede representar correctamente un fallo HTTP.

### Router de colección para la acción manual

Se añadirá un router con prefijo `/news`, registrado bajo `/api/v1`, cuya operación `DELETE ""` no declare body, parámetros ni modelo de respuesta. La dependencia del endpoint construirá la operación compartida con la sesión inyectada por `get_db`; tras una ejecución correcta devolverá un `Response` vacío con estado `204`.

El endpoint permanecerá sin autenticación, como las operaciones administrativas actuales. Las fallas operativas se propagarán al manejo estándar de errores para producir `500` y un cuerpo `ErrorResponse`; no se introducirá un `404` cuando el conjunto a eliminar esté vacío. Se descarta devolver `200` con la cantidad eliminada para conservar la convención de los endpoints `DELETE` existentes.

### Transacción e idempotencia heredadas del purgado existente

`NewsPurgeService` seguirá siendo responsable de confirmar el borrado o ejecutar rollback. El repositorio conservará una única sentencia `DELETE` con el operador estricto `<`; no se cargarán noticias en memoria. Una ejecución sin coincidencias confirma normalmente y el adaptador responde `204`.

No se añadirá un bloqueo global entre el job automático y solicitudes manuales. Las ejecuciones concurrentes aplican el mismo predicado y cada sentencia es atómica; una puede eliminar las filas antes que la otra, pero ninguna debe ampliar el conjunto elegible. La cantidad interna puede variar por concurrencia sin afectar el contrato HTTP.

### Verificación por frontera

Las pruebas unitarias de la operación compartida comprobarán que consulta la configuración en cada ejecución, delega la caducidad vigente y devuelve la cantidad eliminada. Las pruebas API sustituirán la dependencia para verificar `204`, cuerpo vacío, idempotencia y traducción de fallos. La integración API–PostgreSQL cubrirá noticias caducadas, vigentes y en el límite, la cascada y la conservación de entidades ajenas. Una prueba de OpenAPI comprobará la ruta, el método y las respuestas documentadas.

## Risks / Trade-offs

- [Dos purgados se ejecutan al mismo tiempo] → mantener el `DELETE` masivo y transaccional; aceptar que solo una ejecución contabilice una fila ya eliminada.
- [La configuración cambia durante una solicitud] → leerla una vez al inicio y usar ese valor durante toda la transacción.
- [El borrado físico se solicita por error] → mantener el alcance API acordado y documentar que la operación es irreversible; la recuperación depende de respaldos externos.
- [La extracción del caso de uso altera el scheduler] → conservar su contrato, manejo de excepciones y logs, y cubrirlos con las pruebas existentes más una regresión específica.

## Migration Plan

1. Introducir la operación compartida y migrar `run_purge_job()` para utilizarla sin cambiar su comportamiento.
2. Registrar el router `/api/v1/news` y publicar el contrato OpenAPI.
3. Desplegar sin migraciones; la operación queda disponible inmediatamente con la configuración runtime vigente.

Rollback: retirar el router y restaurar la orquestación interna del job. Las noticias que ya hayan sido eliminadas físicamente no pueden recuperarse desde la aplicación y requieren un respaldo externo.
