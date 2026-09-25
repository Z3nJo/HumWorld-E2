# Proposal

## Why

La captura RSS ya persiste noticias, pero ninguna recibe un valor de humor ni un desglose auditable. E2-H02 incorpora el cálculo aprobado en ADR-001 inmediatamente después de la captura y permite procesar las noticias que ya estaban pendientes, para que E2-H03, E2-H04 y los futuros agregados puedan apoyarse en resultados persistidos.

## What Changes

- Calcular el humor a partir del título y la descripción, los términos activos del idioma de la noticia y los parámetros definidos en ADR-001.
- Persistir `valor_humor`, `fecha_analisis` y las ocurrencias y aportes por término en `NOTICIA_TERMINO`, de forma coherente y atómica por fuente.
- Analizar las noticias nuevas tras la captura automática o manual y permitir recuperar noticias anteriores identificadas como pendientes por `fecha_analisis IS NULL`.
- Incorporar los cuatro parámetros de humor a la configuración persistida y compartir un motor de cálculo independiente de HTTP y PostgreSQL.
- Verificar el cálculo con pruebas unitarias y de integración; completar el protocolo de validación con noticias reales antes de cerrar E2-H02.

## Capabilities

### New Capabilities

- `news-sentiment-analysis`: reconocimiento básico de términos, cálculo parametrizado, persistencia auditable, estado de análisis y recuperación de pendientes.

### Modified Capabilities

- `rss-news-capture`: la captura exitosa analiza sus noticias nuevas antes de confirmar la persistencia de la fuente.
- `runtime-configuration`: incorpora y resuelve los cuatro parámetros de humor de ADR-001, sin ampliar por esta historia el contrato HTTP de `/config`.

## Impact

- Backend: motor puro, servicios y repositorios de captura/análisis, modelo y migración de `NOTICIA_TERMINO`, precisión numérica del humor de `NOTICIA`, configuración y seed.
- Base de datos: nueva tabla asociativa, índice para pendientes y precisión del humor persistido. El valor de `TERMINO` sigue siendo aceptado por el CRUD vigente y se comprueba al consumirlo en el motor.
- API: el endpoint de captura manual mantiene su forma de respuesta; sus noticias nuevas quedan analizadas al terminar correctamente la solicitud. No se añade `POST /sentiment`, agregación geográfica ni cambio al CRUD de `/dictionary` en esta historia.
- Documentación de arquitectura: ADR-001 rige el comportamiento; MOD-01 y los ADR quedan fuera de los archivos a editar en esta propuesta. La corrección documental de MOD-01 queda señalada para su responsable.
