## Purpose

Permitir que HumWorld registre canales y administre sus fuentes RSS categorizadas, proporcionando los origenes persistentes que consumiran la carga inicial, la captura automatica, la captura manual y el panel de administracion.

## ADDED Requirements

### Requirement: Alta atomica de canal y fuentes RSS
El sistema SHALL exponer `POST /api/v1/sources` para crear un canal con nombre y continente y asociarle una o mas fuentes RSS en una unica operacion. La solicitud MUST incluir exactamente una referencia de canal: los datos de un canal nuevo o el identificador de un canal existente. La operacion MUST ser atomica y responder `201` con el canal y las fuentes creadas.

#### Scenario: Crear un canal con una fuente
- **WHEN** se envia un canal nuevo con nombre y continente validos y una fuente RSS valida
- **THEN** el sistema persiste el canal y la fuente asociada y responde `201` con sus identificadores y datos

#### Scenario: Crear un canal con varias fuentes
- **WHEN** se envia un canal nuevo y dos o mas fuentes RSS validas
- **THEN** el sistema persiste todas las fuentes asociadas al mismo canal en una unica transaccion

#### Scenario: Asociar fuentes a un canal existente
- **WHEN** se envia el identificador de un canal existente y una o mas fuentes RSS validas
- **THEN** el sistema conserva el canal y crea las fuentes asociadas a el

#### Scenario: Rechazar una solicitud sin fuentes
- **WHEN** la solicitud de alta no contiene ninguna fuente RSS
- **THEN** el sistema no persiste el canal ni fuentes y responde `400`

#### Scenario: Revertir un alta parcialmente invalida
- **WHEN** alguna fuente incluida en el alta incumple una validacion o restriccion de unicidad
- **THEN** el sistema responde `400` y no persiste ninguna parte de la solicitud

### Requirement: Datos y dominios del canal
Cada canal SHALL exponer un identificador, nombre unico y continente. El continente MUST pertenecer al dominio `Africa`, `America`, `Antartida`, `Asia`, `Europa` u `Oceania`.

#### Scenario: Crear canal con datos minimos
- **WHEN** se crea un canal con un nombre no utilizado y un continente valido
- **THEN** el sistema almacena el canal y responde con su identificador, nombre y continente

#### Scenario: Rechazar continente fuera del dominio
- **WHEN** se intenta crear un canal con un continente distinto de los seis valores admitidos
- **THEN** el sistema responde `400` y no crea el canal

#### Scenario: Rechazar nombre de canal duplicado
- **WHEN** se intenta crear un canal cuyo nombre ya pertenece a otro canal
- **THEN** el sistema responde `400` y no crea registros adicionales

### Requirement: Datos y dominios de la fuente RSS
Cada fuente RSS SHALL exponer un identificador, identificador de canal, nombre, URL de feed globalmente unica, categoria IPTC de primer nivel, idioma y estado activo. El idioma MUST ser `es` o `en` y la fuente MUST quedar activa por defecto.

#### Scenario: Registrar una fuente RSS valida
- **WHEN** se registra una fuente con nombre, URL valida y unica, categoria IPTC admitida e idioma `es` o `en`
- **THEN** la fuente queda asociada al canal y activa por defecto

#### Scenario: Rechazar URL de feed duplicada
- **WHEN** la URL indicada ya pertenece a cualquier otra fuente del sistema
- **THEN** el sistema responde `400` y no crea ni modifica la fuente

#### Scenario: Rechazar idioma no soportado
- **WHEN** una fuente declara un idioma diferente de `es` o `en`
- **THEN** el sistema responde `400` y no persiste la fuente

#### Scenario: No descargar el feed durante el alta
- **WHEN** una fuente tiene una URL sintacticamente valida
- **THEN** el sistema permite registrarla sin descargar ni procesar contenido remoto

### Requirement: Categoria IPTC de primer nivel
La categoria de cada fuente SHALL pertenecer al primer nivel de IPTC Media Topics: `arts/culture/entertainment/media`, `conflict/war/peace`, `crime/law/justice`, `disaster/accident`, `economy/business/finance`, `education`, `environment`, `health`, `human interest`, `labour`, `lifestyle/leisure`, `politics`, `religion`, `science/technology`, `society`, `sport` o `weather`.

#### Scenario: Aceptar una categoria IPTC admitida
- **WHEN** una fuente declara cualquiera de los 17 valores IPTC admitidos
- **THEN** el sistema conserva exactamente esa categoria en la fuente

#### Scenario: Rechazar una categoria fuera del primer nivel
- **WHEN** una fuente declara un valor que no pertenece al dominio IPTC admitido
- **THEN** el sistema responde `400` y no persiste la fuente

### Requirement: Consulta de fuentes RSS
El sistema SHALL exponer `GET /api/v1/sources` y `GET /api/v1/sources/{source_id}`. Cada representacion de fuente MUST incluir sus datos y un resumen del canal asociado. El listado MUST admitir filtros opcionales por continente y estado activo.

#### Scenario: Listar fuentes
- **WHEN** se consulta `GET /api/v1/sources` sin filtros
- **THEN** el sistema responde `200` con todas las fuentes registradas y sus canales asociados

#### Scenario: Filtrar fuentes activas por continente
- **WHEN** se consulta el listado indicando un continente valido y estado activo
- **THEN** el sistema responde `200` solo con las fuentes que satisfacen ambos filtros

#### Scenario: Consultar una fuente existente
- **WHEN** se consulta el identificador de una fuente registrada
- **THEN** el sistema responde `200` con la fuente y el resumen de su canal

#### Scenario: Consultar una fuente inexistente
- **WHEN** se consulta un identificador que no corresponde a una fuente
- **THEN** el sistema responde `404`

### Requirement: Reemplazo y actualizacion parcial de fuentes
El sistema SHALL exponer `PUT /api/v1/sources/{source_id}` para reemplazar los campos editables de una fuente y `PATCH /api/v1/sources/{source_id}` para actualizar solo los campos proporcionados. Estas operaciones MUST conservar la asociacion original al canal y las restricciones de URL, IPTC e idioma.

#### Scenario: Reemplazar una fuente
- **WHEN** se envia un `PUT` valido para una fuente existente
- **THEN** el sistema reemplaza sus campos editables y responde `200` con la representacion actualizada

#### Scenario: Actualizar parcialmente una fuente
- **WHEN** se envia un `PATCH` con un subconjunto valido de campos editables
- **THEN** el sistema modifica solo esos campos y responde `200` con la representacion actualizada

#### Scenario: Conservar el canal durante una actualizacion
- **WHEN** se reemplaza o modifica parcialmente una fuente existente
- **THEN** el sistema conserva su identificador de canal original

#### Scenario: Actualizar una fuente inexistente
- **WHEN** se intenta reemplazar o modificar un identificador inexistente
- **THEN** el sistema responde `404` y no modifica registros

### Requirement: Eliminacion de fuentes RSS
El sistema SHALL exponer `DELETE /api/v1/sources/{source_id}` para eliminar fisicamente una fuente RSS y responder `204` sin cuerpo. La eliminacion de la ultima fuente de un canal MUST conservar el canal, porque MOD-01 permite canales sin fuentes.

#### Scenario: Eliminar una fuente existente
- **WHEN** se elimina una fuente registrada
- **THEN** el sistema elimina la fuente, conserva su canal y responde `204` sin cuerpo

#### Scenario: Eliminar una fuente inexistente
- **WHEN** se intenta eliminar un identificador que no corresponde a una fuente
- **THEN** el sistema responde `404`

### Requirement: Contrato REST documentado y sin autenticacion
Todos los endpoints de esta capacidad SHALL estar disponibles bajo `/api/v1`, usar JSON cuando exista cuerpo, permanecer accesibles sin autenticacion y aparecer en `/api/docs` con esquemas, ejemplos, codigos `200`, `201`, `204`, `400`, `404` y `500` segun corresponda.

#### Scenario: Revisar el contrato en Swagger
- **WHEN** se abre `/api/docs`
- **THEN** se muestran todas las operaciones de `/api/v1/sources`, sus entradas, respuestas y errores documentados

#### Scenario: Ejecutar una operacion sin credenciales
- **WHEN** un cliente invoca cualquier operacion de `/api/v1/sources` sin cabecera de autenticacion
- **THEN** el sistema procesa la solicitud conforme a sus datos sin exigir inicio de sesion

### Requirement: Persistencia verificable
Los canales y fuentes creados o modificados SHALL persistir en PostgreSQL y continuar disponibles tras reiniciar el proceso de la API. La funcionalidad MUST poder ejecutarse en el entorno Docker, sus pruebas API-BD MUST ejecutarse en CI y el codigo nuevo de E1-H01 MUST alcanzar una cobertura minima del 80 %.

#### Scenario: Recuperar datos tras reiniciar la API
- **WHEN** se crea una fuente, se reinicia el proceso de la API sin eliminar el volumen de datos y se consulta nuevamente
- **THEN** el sistema devuelve la fuente y su canal con los mismos identificadores y datos persistidos

#### Scenario: Ejecutar pruebas de integracion
- **WHEN** se ejecuta el pipeline asociado al cambio
- **THEN** las pruebas de integracion de `/sources` se ejecutan contra PostgreSQL, finalizan correctamente y el reporte del codigo nuevo alcanza al menos 80 % de cobertura
