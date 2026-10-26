## 1. Dominio y acceso a datos del purgado

- [x] 1.1 Crear `NewsPurgeRepository` con una eliminación física masiva de noticias cuya `fecha_registro` sea anterior a un umbral, con confirmación y rollback transaccionales; verificar mediante prueba PostgreSQL que el repositorio devuelve la cantidad eliminada.
- [x] 1.2 Crear `NewsPurgeService` y su protocolo de repositorio para calcular el umbral UTC a partir de una caducidad positiva y un reloj inyectable; verificar con pruebas unitarias que usa el operador estricto, conserva el límite y devuelve la cantidad eliminada sin base de datos.
- [x] 1.3 Integrar la resolución de `noticias.caducidad_dias` mediante `ConfigurationService` en el caso de uso programado; verificar con repositorios falsos que toma el valor vigente y que una configuración inválida no invoca la eliminación.

## 2. Planificación automática

- [x] 2.1 Incorporar el job de purgado que abra su propia sesión, ejecute el caso de uso, haga rollback y registre el error ante una falla; verificar con pruebas unitarias que una ejecución correcta informa la cantidad eliminada y un error no se propaga al scheduler.
- [x] 2.2 Extender el scheduler existente para registrar captura y purgado al iniciar con `captura.periodicidad_minutos`, y reprogramar ambos sin ejecución inmediata; verificar en `test_scheduler.py` los dos jobs, su intervalo, `max_instances`, `coalesce`, reprogramación y apagado.
- [x] 2.3 Mantener la integración de `PUT /api/v1/config` con la operación de reprogramación existente; verificar que al actualizar la periodicidad el scheduler activo aplica el nuevo intervalo a ambos jobs sin modificar el contrato HTTP.

## 3. Integridad y verificación con datos de prueba

- [x] 3.1 Agregar una prueba de integración PostgreSQL con noticias vencidas, vigentes y exactamente en el umbral; verificar que solo las estrictamente anteriores se eliminan conforme a la caducidad configurada.
- [x] 3.2 En la misma integración, asociar una noticia vencida a `NOTICIA_TERMINO`; verificar la eliminación en cascada de sus aportes y la conservación de fuentes, canales, términos y configuración.
- [x] 3.3 Ejecutar las pruebas unitarias de purgado y scheduler sin PostgreSQL, y la suite de integración PostgreSQL pertinente; verificar el criterio de finalización con datos de prueba y sin regresiones en captura.

## 4. Contrato OpenSpec entregable

- [x] 4.1 Sincronizar el delta `news-purging` en la especificación principal mediante OpenSpec y actualizar `opsx/sync_contracts.py` para generar `opsx/contracts/news-purging/spec.md`; verificar los modos normal y `--check`.
- [x] 4.2 Ejecutar `openspec validate e4-h02-news-purging --strict` y las verificaciones de contratos; confirmar que la capacidad, sus escenarios y el contrato generado quedan consistentes.
