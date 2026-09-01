## 1. Dependencias y persistencia

- [ ] 1.1 Agregar `feedparser` y `APScheduler` a las dependencias y `capture_scheduler_enabled` a la configuracion del backend; verificar que la instalacion y las pruebas de settings finalicen correctamente.
- [ ] 1.2 Crear el modelo SQLAlchemy `Noticia` conforme a MOD-01, registrar sus relaciones con `RssSource` y verificar que metadata contenga campos, nullabilidad y cascada esperados.
- [ ] 1.3 Crear la migracion Alembic posterior a `20260830_01` con tabla `noticia`, checks, FK en cascada, unicidad `(id_fuente, guid_origen)` e indices de fecha/humor; verificar `alembic upgrade head` sobre PostgreSQL limpio y esquema existente.

## 2. Lectura y normalizacion RSS

- [ ] 2.1 Implementar el cliente RSS con `httpx`, timeout y parseo de bytes mediante `feedparser`; verificar con pruebas unitarias respuestas validas, errores HTTP y feeds no interpretables sin usar Internet.
- [ ] 2.2 Implementar la normalizacion de entradas con `guid` o fallback a `link`, fechas opcionales, idioma heredado y omision de entradas sin URL utilizable; verificar mediante fixtures RSS en español e ingles.

## 3. Repositorio y caso de uso de captura

- [ ] 3.1 Extender la persistencia con consulta de fuentes activas, insercion idempotente con conflicto ignorado y actualizacion transaccional de `fecha_ultima_captura`; verificar el comportamiento con pruebas PostgreSQL.
- [ ] 3.2 Implementar el servicio de captura con una unidad de trabajo por fuente, conteo de insertadas/duplicadas/invalidas y aislamiento de fallos; verificar con repositorios y clientes falsos que una fuente fallida no detenga las demas.
- [ ] 3.3 Garantizar que `fecha_ultima_captura` se actualice tras un feed correcto aunque no haya novedades y permanezca intacta tras un fallo; verificar ambos escenarios en pruebas unitarias y de integracion.

## 4. Scheduler y configuracion runtime

- [ ] 4.1 Implementar el coordinador APScheduler con job estable, intervalo configurable, `max_instances=1`, coalescencia y primera ejecucion posterior al intervalo; verificar programacion, reemplazo y cierre sin esperar tiempo real.
- [ ] 4.2 Integrar inicio y detencion del scheduler en el lifespan de FastAPI y ejecutar cada job con una sesion de base de datos propia; verificar que el backend inicia/cierra sin capturas inmediatas y que el scheduler puede desactivarse por entorno.
- [ ] 4.3 Conectar `ConfigurationService` con un puerto de reprogramacion posterior a una persistencia valida y una implementacion nula cuando el scheduler este desactivado; verificar que `PUT /api/v1/config` conserva su contrato y aplica el nuevo intervalo sin reinicio.

## 5. Verificacion automatizada

- [ ] 5.1 Completar pruebas unitarias de captura para fuentes activas/inactivas, normalizacion, fechas, fallback de identificador, duplicados, entradas invalidas y continuidad ante errores; verificar que todas funcionen sin red ni PostgreSQL.
- [ ] 5.2 Completar pruebas de integracion PostgreSQL para migracion, persistencia, unicidad concurrente/idempotente, cascada y timestamps de fuente/noticia; verificar su ejecucion con `DATABASE_URL` sobre una base migrada.
- [ ] 5.3 Ejecutar toda la suite backend con reporte de cobertura y corregir regresiones hasta superar el umbral de CI de 80 %; verificar `pytest --cov=. --cov-report=term-missing --cov-fail-under=80` en verde.

## 6. Documentacion y validacion funcional

- [ ] 6.1 Actualizar README y documentacion backend con operacion del cron, periodicidad, flag de scheduler, limitacion de una instancia y procedimiento de comprobacion; verificar que los comandos documentados funcionen desde una base limpia.
- [ ] 6.2 Crear evidencia de Sprint para E1-H03 con migracion, ejecucion sobre fuentes seed, `fecha_registro`, `fecha_ultima_captura`, fallo aislado y segundo ciclo sin duplicados; verificar cada criterio del Backlog y la Definition of Done.
- [ ] 6.3 Sincronizar los contratos OpenSpec entregables y verificar que `/api/docs` conserve `/config` sin endpoints adelantados; ejecutar `python opsx/sync_contracts.py --check`.
- [ ] 6.4 Levantar `docker compose -f opsx/docker-compose.yml up --build`, observar al menos dos ciclos con periodicidad corta y verificar en PostgreSQL que se recorren fuentes activas y no se duplican noticias.
