## ADDED Requirements

### Requirement: Captura manual de fuentes RSS desde la interfaz

La interfaz SHALL permitir ejecutar la captura RSS inmediata mediante `POST /api/v1/sources/capture`, tanto para todas las fuentes elegibles como para los canales RSS de un medio concreto, y SHALL informar el resultado devuelto por la API sin recalcularlo en el cliente.

#### Scenario: Capturar todas las fuentes elegibles
- **WHEN** el usuario pulsa «Capturar ahora» en la barra superior de `/fuentes`
- **THEN** se envía `POST /api/v1/sources/capture` sin cuerpo
- **AND** al responder `200` se muestra un toast con `inserted` como noticias insertadas, `failed_sources` como fuentes fallidas y la cantidad de `skipped_source_ids` como fuentes omitidas

#### Scenario: Capturar los canales RSS de un medio
- **WHEN** el usuario pulsa «Capturar» en la fila de un medio activo con al menos un canal RSS activo
- **THEN** se envía `POST /api/v1/sources/capture` con `{ "source_ids": [...] }` que contiene únicamente los identificadores de los canales RSS activos de ese medio
- **AND** al responder `200` se muestra el mismo resumen de resultado que en la captura global

#### Scenario: Medio sin canales RSS capturables
- **WHEN** un medio está inactivo o no tiene canales RSS activos
- **THEN** su acción «Capturar» se muestra deshabilitada
- **AND** no se envía ninguna petición de captura para ese medio

#### Scenario: Evitar capturas simultáneas
- **WHEN** hay una captura en curso iniciada desde la pantalla
- **THEN** «Capturar ahora» y todas las acciones «Capturar» por medio permanecen deshabilitadas
- **AND** la acción que inició la captura indica que la operación está en curso
- **AND** las acciones se rehabilitan cuando la petición finaliza con éxito o con error

#### Scenario: Informar fuentes con error
- **WHEN** la respuesta `200` incluye uno o más elementos de `sources` con `error` distinto de `null`
- **THEN** el toast de resultado indica que hubo fuentes fallidas con su cantidad
- **AND** se presenta con el estilo de error en lugar del de éxito

#### Scenario: Fallo de la petición de captura
- **WHEN** `POST /api/v1/sources/capture` responde `400`, `404` o `500`, o la red falla
- **THEN** se muestra un toast de error con el mensaje legible obtenido según el tratamiento de errores de API existente
- **AND** los datos de la tabla y los filtros aplicados se conservan sin cambios
