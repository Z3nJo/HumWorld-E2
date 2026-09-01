## Context

E1-H01 ya proporciona `CANAL`, `FUENTE_RSS`, estado `activa` y `fecha_ultima_captura`; E1-H04 proporciona `captura.periodicidad_minutos` mediante el servicio de configuracion. El backend usa FastAPI, SQLAlchemy, Alembic y PostgreSQL con separacion `api -> services -> repositories -> models`. ADR-003 fija `feedparser` para RSS y APScheduler para jobs reconfigurables en caliente. MOD-01 define la entidad `NOTICIA` y la unicidad `(id_fuente, guid_origen)`. Vease `proposal.md` para la motivacion y los limites funcionales.

El despliegue actual ejecuta una unica instancia de Uvicorn en el contenedor backend. Las pruebas existentes usan dobles simples para servicios y PostgreSQL real para integracion; CI exige al menos 80 % de cobertura global.

## Goals / Non-Goals

**Goals:**

- Mantener la captura como logica de negocio reutilizable, independiente del disparador automatico y de FastAPI.
- Hacer que cada ejecucion sea idempotente y que cada fuente constituya una unidad aislada de trabajo.
- Integrar el job con el ciclo de vida del backend y con cambios runtime de periodicidad.
- Conservar transacciones, consultas y restricciones dentro de repositorios y migraciones.
- Permitir pruebas deterministas sin red ni esperas temporales reales.

**Non-Goals:**

- Disenar el endpoint o la experiencia de captura manual de E1-H05.
- Crear contratos REST de noticias, sentimiento o purgado.
- Coordinar el scheduler entre multiples workers, procesos o replicas.
- Detectar automaticamente el idioma o limpiar HTML para analisis semantico.

## Decisions

### 1. Materializar `NOTICIA` conforme a MOD-01

Se agregara una migracion posterior a `20260830_01` y un modelo SQLAlchemy con `id_noticia`, FK `id_fuente` con `ON DELETE CASCADE`, `guid_origen` y `titulo` de hasta 500 caracteres, `descripcion` de texto largo, `url` de hasta 500 caracteres, `idioma` restringido a `es` o `en`, fechas de publicacion/registro/analisis y `valor_humor` nullable. La migracion incluira la restriccion unica `(id_fuente, guid_origen)` y los indices de `fecha_registro` y `valor_humor` previstos por MOD-01.

`fecha_registro` usara hora con zona y valor generado al persistir. `valor_humor` y `fecha_analisis` quedaran nulos. No se creara todavia `NOTICIA_TERMINO`, porque su escritura pertenece al analisis de sentimiento.

Alternativa descartada: crear una tabla reducida solo para captura. Obligaria a otra migracion estructural inmediata y se apartaria del modelo aprobado que las historias posteriores ya consumen.

### 2. Separar descarga, normalizacion, orquestacion y persistencia

El servicio de captura dependera de protocolos para obtener feeds y persistir resultados. Un cliente RSS descargara con `httpx`, aplicara timeout y entregara bytes a `feedparser`; el servicio recibira entradas normalizadas y no conocera detalles HTTP ni consultas SQLAlchemy. El repositorio proporcionara fuentes activas, insercion idempotente de noticias y actualizacion de `fecha_ultima_captura`.

El job programado sera un adaptador de entrada: abrira una sesion propia mediante la fabrica de sesiones, construira repositorios y ejecutara el mismo caso de uso de captura que podra reutilizar E1-H05. No se agregara un endpoint manual en este cambio.

Alternativa descartada: llamar a `GET /sources` o a otro endpoint desde el cron. Introduciria una vuelta HTTP dentro del mismo proceso y romperia el acceso directo del caso de uso a sus repositorios.

### 3. Aplicar una transaccion independiente por fuente

Cada fuente se procesara y confirmara de forma independiente. Las noticias validas y la nueva `fecha_ultima_captura` se confirmaran juntas al terminar correctamente el feed. Si falla la descarga, el parseo general o la persistencia, la transaccion de esa fuente se revertira y el recorrido continuara con la siguiente.

Las entradas sin enlace utilizable se omitiran porque `NOTICIA.url` es obligatoria; una ausencia de `guid` se resolvera usando el enlace. Las fechas de publicacion ausentes permaneceran nulas y el idioma se heredara de la fuente. Los valores que no puedan representarse conforme a MOD-01 se trataran como entradas invalidas y no invalidaran por si solos el feed completo.

Alternativa descartada: una unica transaccion para todas las fuentes. Un fallo remoto o de datos al final del recorrido perderia noticias validas obtenidas previamente y contradiria el aislamiento requerido.

### 4. Hacer la deduplicacion idempotente y resistente a carreras

El repositorio usara la restriccion unica de PostgreSQL como autoridad final y una insercion con conflicto ignorado para `(id_fuente, guid_origen)`. El servicio podra reportar cuantas entradas fueron insertadas, omitidas o fallidas sin convertir un duplicado esperado en error de captura.

Alternativa descartada: consultar existencia y luego insertar como unico mecanismo. Dos ejecuciones concurrentes podrian superar simultaneamente la consulta previa y producir una carrera.

### 5. Ejecutar un unico job APScheduler ligado al ciclo de vida de FastAPI

Se usara un scheduler en proceso iniciado y detenido con el `lifespan` de FastAPI. Al iniciar, leera la configuracion mediante repositorio/servicio y registrara un job de intervalo cuya primera ejecucion ocurre al completar el periodo. El job tendra identificador estable, `max_instances=1` y coalescencia activada para evitar solapamientos y acumulacion de ejecuciones atrasadas.

Una opcion `capture_scheduler_enabled`, configurable por entorno y verdadera por defecto, permitira desactivar el adaptador automatico en pruebas que no lo evaluan. El Docker de ejecucion conservara el valor activo. Las pruebas del scheduler usaran un coordinador controlado y no esperaran minutos reales.

Alternativa descartada: ejecutar una captura inmediata durante el arranque. Acoplaria la disponibilidad de la API a servicios RSS externos, introduciria efectos remotos en pruebas y no es requerida por el criterio de la historia.

### 6. Reprogramar despues de persistir una nueva periodicidad

El servicio de configuracion recibira un puerto de coordinacion del scheduler. Despues de que el repositorio persista una configuracion valida, notificara el nuevo intervalo para reemplazar el job existente sin ejecutar una captura inmediata. Cuando el scheduler este desactivado se inyectara una implementacion nula. El wiring se resolvera en la API/lifespan, sin introducir consultas en `api/` ni dependencias de FastAPI en el servicio.

Si la reprogramacion operativa falla despues del commit, la solicitud no se considerara exitosa, se registrara el error y el valor persistido sera reconciliado al reiniciar o al realizar una nueva actualizacion. Esta limitacion evita fingir atomicidad distribuida entre PostgreSQL y memoria de proceso.

Alternativa descartada: releer la tabla en cada tick. Añadiria consultas periodicas y no cumpliria con claridad la reprogramacion en caliente acordada en ADR-003.

### 7. Mantener las pruebas libres de red real

Las pruebas unitarias cubriran normalizacion, seleccion de fuentes activas, aislamiento, timestamps, fallback de identificador, duplicados y resumen de ejecucion mediante clientes y repositorios falsos. Las pruebas PostgreSQL aplicaran la migracion y verificaran constraints, cascada, insercion repetida y actualizacion transaccional de la fuente. Las pruebas del ciclo de vida comprobaran registro, reprogramacion y cierre del job con el adaptador RSS sustituido.

La validacion manual se realizara en Docker con una periodicidad corta, las fuentes seed y evidencia de filas en `noticia`, `fecha_registro`, ausencia de duplicados y `fecha_ultima_captura`. Swagger solo debe comprobar que `/config` conserva su contrato, ya que E1-H03 no agrega endpoints.

## Risks / Trade-offs

- [Dos procesos del backend ejecutarian dos schedulers] -> Mantener un unico proceso en el despliegue actual y documentar que escalar horizontalmente requiere liderazgo o scheduler externo.
- [Una fuente lenta puede prolongar el recorrido] -> Aplicar timeout por descarga y aislamiento por fuente; no solapar instancias del job.
- [Feeds reales pueden contener datos incompletos o formatos de fecha variables] -> Normalizar solo los campos admitidos, permitir fechas opcionales y omitir entradas sin URL utilizable.
- [La configuracion puede persistirse antes de un fallo excepcional al reprogramar] -> Responder con error, registrar el incidente y reconciliar desde PostgreSQL al reiniciar o reintentar el `PUT`.
- [El scheduler puede producir efectos remotos durante pruebas no relacionadas] -> Permitir desactivarlo por configuracion y sustituir el cliente RSS en las pruebas que ejercitan su ciclo de vida.
- [El cambio crea la base de datos consumida por sentimiento y purgado] -> Respetar exactamente los campos, nullabilidad, cascada e indices de MOD-01 y no escribir datos que pertenecen a esas historias.

## Migration Plan

1. Incorporar las dependencias fijadas por ADR-003 y la opcion de activacion del scheduler.
2. Aplicar la migracion de `noticia` sobre una base limpia y sobre el esquema actual con fuentes/configuracion existentes.
3. Desplegar modelo, repositorios, cliente RSS y servicio de captura con sus pruebas unitarias y PostgreSQL.
4. Integrar el job con el lifespan y conectar la reprogramacion posterior a `PUT /config`.
5. Ejecutar la suite con cobertura, sincronizar contratos, levantar Docker y conservar evidencia funcional de dos ciclos sin duplicados.

Para rollback, se detendra primero el backend para impedir nuevas capturas y luego se revertira la migracion solo en entornos donde sea aceptable eliminar las noticias capturadas. En entornos con datos relevantes se realizara un respaldo antes de retirar la tabla.
