## Purpose

Permitir que HumWorld administre por API un diccionario persistente de términos evaluables en español e inglés, preparado para ser consumido posteriormente por el motor de sentimiento.

## ADDED Requirements

### Requirement: Datos y normalización del término
Cada término SHALL exponer identificador, palabra, idioma, valor decimal finito, estado activo, fecha de alta y fecha de modificación. La palabra MUST almacenarse sin espacios exteriores y en minúsculas, conservando sus tildes y demás caracteres; después de normalizarla MUST contener entre 1 y 100 caracteres. El idioma MUST ser `es` o `en`, y el estado MUST ser activo por defecto. El sistema MUST mantener única la pareja formada por palabra normalizada e idioma.

#### Scenario: Normalizar un término válido
- **WHEN** se registra la palabra `  Alegría  ` con idioma `es` y un valor decimal finito
- **THEN** el sistema almacena `alegría`, conserva la tilde y crea el término activo

#### Scenario: Admitir la misma palabra en dos idiomas
- **WHEN** existen dos solicitudes con la misma palabra normalizada y con idiomas `es` y `en`
- **THEN** el sistema permite persistir ambos términos como registros distintos

#### Scenario: Rechazar un término duplicado
- **WHEN** ya existe la misma palabra normalizada para el mismo idioma
- **THEN** el sistema responde `400` y no crea ni modifica registros

#### Scenario: Rechazar datos fuera del dominio mínimo
- **WHEN** la palabra queda vacía después de normalizarla, supera 100 caracteres, el idioma no es `es` o `en`, o el valor no es un decimal finito
- **THEN** el sistema responde `400` y no persiste cambios

### Requirement: Listado, búsqueda y detalle del diccionario
El sistema SHALL exponer `GET /api/v1/dictionary` para listar todos los términos y aceptar el parámetro opcional `q` para buscar por coincidencia parcial de la palabra sin distinguir mayúsculas. Las tildes MUST conservarse y participar en la comparación. El sistema SHALL exponer `GET /api/v1/dictionary/{term_id}` para consultar un término por identificador. Los resultados del listado MUST mantener un orden determinista por palabra, idioma e identificador.

#### Scenario: Listar el diccionario completo
- **WHEN** se consulta `GET /api/v1/dictionary` sin parámetros
- **THEN** el sistema responde `200` con todos los términos activos e inactivos ordenados de forma determinista

#### Scenario: Buscar por texto parcial
- **WHEN** se consulta `GET /api/v1/dictionary?q=ale`
- **THEN** el sistema responde `200` únicamente con términos cuya palabra contiene `ale` sin distinguir mayúsculas

#### Scenario: Buscar sin resultados
- **WHEN** ninguna palabra coincide con el texto de búsqueda
- **THEN** el sistema responde `200` con una lista vacía

#### Scenario: Consultar un término existente
- **WHEN** se consulta el identificador de un término registrado
- **THEN** el sistema responde `200` con todos sus datos

#### Scenario: Consultar un término inexistente
- **WHEN** se consulta un identificador que no pertenece a ningún término
- **THEN** el sistema responde `404`

### Requirement: Creación de términos
El sistema SHALL exponer `POST /api/v1/dictionary` para crear un término con palabra, idioma y valor, permitiendo indicar opcionalmente el estado activo. Una creación válida MUST responder `201` con el término persistido.

#### Scenario: Crear un término con estado por defecto
- **WHEN** se envían palabra, idioma y valor válidos sin indicar `activo`
- **THEN** el sistema crea el término activo y responde `201`

#### Scenario: Crear un término inicialmente inactivo
- **WHEN** se envían datos válidos con `activo=false`
- **THEN** el sistema conserva el estado indicado y responde `201`

### Requirement: Reemplazo y actualización parcial de términos
El sistema SHALL exponer `PUT /api/v1/dictionary/{term_id}` para reemplazar palabra, idioma, valor y estado activo, y `PATCH /api/v1/dictionary/{term_id}` para actualizar solamente los campos proporcionados. Ambas operaciones MUST aplicar normalización, validación y unicidad, actualizar la fecha de modificación y conservar el identificador y la fecha de alta.

#### Scenario: Reemplazar un término
- **WHEN** se envía un `PUT` válido con todos los campos editables para un término existente
- **THEN** el sistema reemplaza sus datos, actualiza la fecha de modificación y responde `200`

#### Scenario: Actualizar parcialmente un término
- **WHEN** se envía un `PATCH` válido con un subconjunto no vacío de campos editables
- **THEN** el sistema modifica únicamente esos campos, actualiza la fecha de modificación y responde `200`

#### Scenario: Rechazar una actualización parcial vacía
- **WHEN** se envía un `PATCH` sin campos editables
- **THEN** el sistema responde `400` y conserva el término sin cambios

#### Scenario: Actualizar un término inexistente
- **WHEN** se envía `PUT` o `PATCH` para un identificador inexistente
- **THEN** el sistema responde `404` y no modifica registros

#### Scenario: Revertir una actualización incompatible
- **WHEN** un reemplazo o actualización produciría una pareja palabra e idioma ya existente
- **THEN** el sistema responde `400` y conserva el estado anterior del diccionario

### Requirement: Eliminación lógica de términos
El sistema SHALL exponer `DELETE /api/v1/dictionary/{term_id}` para desactivar lógicamente el término y responder `204` sin cuerpo. La operación MUST conservar el registro y sus datos para permitir relaciones históricas futuras, y MUST ser idempotente para un término ya inactivo.

#### Scenario: Eliminar un término activo
- **WHEN** se elimina un término existente y activo
- **THEN** el sistema establece `activo=false`, actualiza su fecha de modificación y responde `204`

#### Scenario: Eliminar nuevamente un término inactivo
- **WHEN** se elimina un término existente que ya está inactivo
- **THEN** el sistema conserva el término inactivo y responde `204`

#### Scenario: Eliminar un término inexistente
- **WHEN** se intenta eliminar un identificador inexistente
- **THEN** el sistema responde `404`

### Requirement: Valor independiente de ADR-001
E2-H01-API SHALL aceptar y persistir valores decimales finitos sin imponer un rango emocional ni una precisión semántica definitiva. La interpretación, límites y fórmula de esos valores MUST permanecer fuera de esta capacidad hasta que ADR-001 y el motor de sentimiento los definan.

#### Scenario: Persistir un decimal sin escala emocional definida
- **WHEN** se crea o actualiza un término con cualquier valor decimal finito representable por la persistencia
- **THEN** el sistema conserva el valor sin aplicar límites propios del futuro algoritmo de sentimiento

### Requirement: Contrato documentado, persistente y sin autenticación
Todas las operaciones del diccionario SHALL usar JSON cuando exista cuerpo, permanecer disponibles sin autenticación y aparecer en `/api/docs` con sus entradas, respuestas y códigos `200`, `201`, `204`, `400`, `404` y `500` según corresponda. Los términos MUST persistir en PostgreSQL y continuar disponibles tras reiniciar la API; las pruebas API–base de datos MUST ejecutarse en CI y la capacidad MUST funcionar en el entorno Docker.

#### Scenario: Revisar el contrato en Swagger
- **WHEN** se abre `/api/docs`
- **THEN** se muestran todas las operaciones de `/api/v1/dictionary`, sus schemas, ejemplos y respuestas documentadas

#### Scenario: Operar sin credenciales
- **WHEN** un cliente invoca una operación válida del diccionario sin credenciales
- **THEN** el sistema procesa la solicitud sin exigir autenticación

#### Scenario: Recuperar términos tras reiniciar la API
- **WHEN** se crea un término, se reinicia la API sin eliminar el volumen y se consulta nuevamente
- **THEN** el sistema devuelve el término con el mismo identificador y datos

#### Scenario: Ejecutar integración en CI y Docker
- **WHEN** se ejecuta el pipeline y la validación del cambio
- **THEN** las pruebas del diccionario se ejecutan contra PostgreSQL y la API funciona en el entorno Docker
