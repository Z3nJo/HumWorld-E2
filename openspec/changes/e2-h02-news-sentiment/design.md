# Design

## Context

Ver la motivación en [proposal.md](proposal.md) y los contratos en `specs/`. ADR-001 está aceptado. Hoy `NewsCaptureService` inserta noticias con ambos campos de análisis nulos y `NewsCaptureRepository.persist_source_capture` hace `commit` por fuente antes de que exista un cálculo. `NOTICIA_TERMINO` aún no existe en el código ni en las migraciones. `CONFIGURACION` ya es clave-valor, pero no contiene los cuatro parámetros de humor. El CRUD vigente de `TERMINO.valor` admite decimales finitos sin límite de escala.

## Goals / Non-Goals

**Goals:**

- Hacer que una captura exitosa deje sus noticias nuevas analizadas y su desglose persistido de manera atómica por fuente.
- Mantener un cálculo reutilizable y comprobable sin HTTP ni base de datos, con parámetros resueltos por la capa de aplicación.
- Procesar de forma segura las noticias que se capturaron antes de E2-H02 y siguen pendientes.

**Non-Goals:**

- Editar MOD-01, ADR-001 u otros documentos de arquitectura; la corrección documental H-6 corresponde a sus responsables.
- Cambiar los endpoints o el contrato de `/dictionary`, ampliar `GET`/`PUT /config`, crear `POST /sentiment` o implementar agregados geográficos.
- Lematizar palabras o reconocer formas flexionadas; E2-H03 ampliará esa estrategia.
- Recalcular automáticamente noticias ya analizadas al editar términos o configuración.

## Decisions

### 1. Motor y reconocedor independientes de la persistencia

El servicio de aplicación carga términos activos por idioma y parámetros resueltos; entrega datos inmutables a un reconocedor y a una función pura de cálculo. El reconocedor normaliza mayúsculas y tildes y compara tokens completos o secuencias completas de tokens; las apariciones repetidas aumentan `ocurrencias`. Esta estrategia inicial conserva una interfaz para sustituir o ampliar el reconocimiento en E2-H03. El motor recibe `(valor, ocurrencias)` y parámetros explícitos, calcula con `Decimal`, devuelve valor y aportes y no importa modelos de SQLAlchemy, configuración ni FastAPI.

Se elige este límite para que E2-H04 pueda usar exactamente el mismo motor más adelante. Se descarta calcular dentro del modelo ORM o duplicar la fórmula en la ruta HTTP. Las tres estrategias y los cuatro parámetros serán los definidos por ADR-001; `promedio_ponderado` es el valor por defecto. `suma_acotada` aplica el acotamiento explícito de ADR-001; para el promedio ponderado no se recorta el resultado. Los valores de término fuera de `[-10, 10]` o resultados fuera de `[-1, 1]` fallan explícitamente.

### 2. Una unidad de trabajo por fuente capturada

La descarga y normalización del feed ocurren antes de iniciar la transacción. La unidad de trabajo inserta con deduplicación y obtiene los ID efectivamente nuevos, carga una instantánea de términos y parámetros para la fuente, calcula cada noticia nueva, escribe las filas `NOTICIA_TERMINO`, `valor_humor` y `fecha_analisis`, actualiza `fecha_ultima_captura` y confirma una vez. El servicio conserva el reporte y el aislamiento actuales: una excepción revierte únicamente esa fuente y el recorrido continúa.

Para lograrlo, el repositorio deja de confirmar dentro de `persist_source_capture` y devuelve los registros nuevos, no solo su cantidad. La capa de aplicación coordina el cierre de la transacción mediante una interfaz de unidad de trabajo; el motor permanece independiente del repositorio. Se descarta hacer un segundo paso después del `commit` porque dejaría capturas exitosas con noticias sin analizar y exigiría compensaciones adicionales. La respuesta HTTP de captura manual conserva los campos existentes.

### 3. Pendientes históricos y concurrencia

El proceso de captura programada ejecuta además una pasada de recuperación en lotes acotados sobre noticias con `fecha_analisis IS NULL`, incluso si no hubo novedades en el feed. Cada lote bloquea las filas seleccionadas con una estrategia equivalente a `FOR UPDATE SKIP LOCKED`, calcula y confirma en una transacción; así dos trabajadores no reclaman la misma noticia. Una ejecución repetida continúa con el siguiente lote hasta agotar el atraso de acuerdo con el límite operativo establecido. La captura manual analiza sus noticias nuevas y no dispara una recuperación global inesperada.

Una noticia analizada sin términos conserva `valor_humor = NULL` y `fecha_analisis` informada, por lo que queda fuera de futuros lotes. No se usa `valor_humor IS NULL` como selector. La selección y el índice físico siguen H-6 de ADR-001, aunque la actualización del documento MOD-01 debe efectuarla su responsable.

### 4. Esquema y precisión

Una migración crea `NOTICIA_TERMINO` con clave primaria compuesta `(id_noticia, id_termino)`, claves foráneas, `ocurrencias > 0` y `aporte_humor NUMERIC(8,2)`. La FK a `NOTICIA` elimina los aportes cuando se purga la noticia; la eliminación lógica de un término conserva las filas históricas. Se añade un índice parcial para `fecha_analisis IS NULL` y se establece `NOTICIA.valor_humor NUMERIC(4,3)` con restricción de rango `[-1, 1]`. Se revisan previamente los datos existentes antes de estrechar esa columna.

El cálculo usa precisión decimal; se cuantiza al persistir con `ROUND_HALF_UP` para tres decimales de humor y dos de aporte. La fecha de análisis se fija aunque el resultado sea nulo. Los aportes son `ocurrencias × valor` sin normalizar, como indica ADR-001. `TERMINO.valor` conserva por esta historia su tipo y contrato actuales: el motor valida tanto el rango como el límite de un decimal efectivo de los valores que consume, porque el CRUD de E2-H01 admite una precisión más amplia. Esto preserva la reconstrucción exacta del promedio desde `NOTICIA_TERMINO`. Restringir físicamente esa columna requeriría una revisión separada del CRUD y de sus datos preexistentes.

### 5. Resolución de parámetros y arranque

Una inicialización idempotente incorpora en `CONFIGURACION` los cuatro registros de humor con valor, tipo y descripción aprobados. La capa de aplicación los valida y construye un objeto de parámetros antes de llamar al motor; el motor nunca consulta la tabla. El arranque registra la advertencia P-4 cuando existen términos y la escala configurada no coincide con el máximo absoluto observado. Una fórmula desconocida o un divisor no positivo produce error explícito. No se modifica la respuesta ni el cuerpo de `/api/v1/config` en E2-H02.

## Risks / Trade-offs

- **Diccionario con valores fuera de rango o con más de un decimal efectivo** → el análisis de la fuente falla y se revierte, sin introducir un humor incorrecto. La validación previa de datos y el registro del ID del término permiten corregir esos registros por el proceso autorizado. La alineación futura del CRUD pertenece a otra decisión.
- **Captura más lenta por análisis sincrónico** → cargar términos una vez por fuente, reutilizar el reconocedor y medir la duración de las pruebas de integración; la transacción no incluye la descarga de red.
- **Atraso histórico voluminoso** → procesar pendientes en lotes con bloqueo y un límite por ejecución; el selector indexado permite recuperar el atraso en ejecuciones sucesivas.
- **Fórmula o términos modificados después del análisis** → los resultados son instantáneas según H-7. Una auditoría histórica con fórmula alternativa exige conocer la configuración que regía en `fecha_analisis`; esta historia no incorpora versionado de parámetros.
- **Corpus insuficiente para la validación C-V9** → terminar las pruebas funcionales sin declarar cerrada E2-H02. El informe del protocolo de ADR-001 debe elaborarse y publicarse por los responsables indicados allí antes del cierre; si falta corpus o diccionario poblado, registrar el traslado de esa validación al Sprint 3.

## Migration Plan

1. Aplicar la migración de esquema y el seed idempotente antes de activar la nueva captura. No borrar ni reescribir noticias existentes.
2. Activar el análisis inmediato para noticias nuevas y la recuperación programada de pendientes históricos.
3. Verificar sobre PostgreSQL migrado que una noticia con términos y otra sin términos terminan con `fecha_analisis` informada, y que el desglose permite reconstruir el valor ponderado persistido.
4. Si se revierte el despliegue de aplicación, mantener la nueva tabla y columnas compatibles mientras se decide una reversión de datos; no eliminar aportes o resultados históricos de forma automática.
