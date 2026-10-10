## ADDED Requirements

### Requirement: Consulta de canales
El sistema SHALL exponer `GET /api/v1/channels` y `GET /api/v1/channels/{channel_id}`. Cada representacion SHALL incluir `id_canal`, `nombre`, `continente`, `pais`, `url_sitio`, `activo` y `fecha_alta`. El listado SHALL devolver por defecto canales activos e inactivos y MUST admitir filtros opcionales `continent`, `country` y `active`.

#### Scenario: Listar todos los canales
- **WHEN** se consulta `GET /api/v1/channels` sin filtros
- **THEN** el sistema responde `200` con todos los canales registrados, incluidos los inactivos

#### Scenario: Filtrar canales
- **WHEN** se consulta el listado con una combinacion valida de continente, pais y estado
- **THEN** el sistema responde `200` solamente con los canales que satisfacen todos los filtros indicados

#### Scenario: Consultar un canal existente
- **WHEN** se consulta el identificador de un canal registrado
- **THEN** el sistema responde `200` con todos sus campos observables

#### Scenario: Consultar un canal inexistente
- **WHEN** se consulta un identificador que no corresponde a un canal
- **THEN** el sistema responde `404`

### Requirement: Reemplazo y actualizacion parcial de canales
El sistema SHALL exponer `PUT /api/v1/channels/{channel_id}` para reemplazar `nombre`, `continente`, `pais`, `url_sitio` y `activo`, y `PATCH /api/v1/channels/{channel_id}` para actualizar solamente los campos proporcionados. `PUT` MUST exigir todos los campos editables; `PATCH` MUST exigir al menos uno. `pais` y `url_sitio` MAY recibir `null`; los demas campos editables MUST NOT recibir `null`.

#### Scenario: Reemplazar un canal
- **WHEN** se envia un `PUT` valido con todos los campos editables para un canal existente
- **THEN** el sistema reemplaza esos campos, conserva el identificador y la fecha de alta, y responde `200`

#### Scenario: Actualizar parcialmente un canal
- **WHEN** se envia un `PATCH` valido con un subconjunto de campos editables
- **THEN** el sistema modifica solamente esos campos y responde `200` con la representacion actualizada

#### Scenario: Limpiar datos opcionales
- **WHEN** se envia un `PATCH` con `pais` o `url_sitio` igual a `null`
- **THEN** el sistema elimina el valor opcional indicado sin modificar los demas campos

#### Scenario: Rechazar una actualizacion vacia o nula invalida
- **WHEN** se envia un `PATCH` sin campos o con `null` para `nombre`, `continente` o `activo`
- **THEN** el sistema responde `400` y conserva el canal sin cambios

#### Scenario: Rechazar un nombre duplicado
- **WHEN** un reemplazo o actualizacion intenta usar el nombre de otro canal
- **THEN** el sistema responde `400` y conserva ambos canales sin cambios

#### Scenario: Actualizar un canal inexistente
- **WHEN** se intenta reemplazar o actualizar parcialmente un identificador inexistente
- **THEN** el sistema responde `404` y no modifica registros

### Requirement: Desactivacion logica de canales
El sistema SHALL exponer `DELETE /api/v1/channels/{channel_id}` como una desactivacion logica idempotente. La operacion MUST establecer `activo=false`, responder `204` sin cuerpo y MUST conservar el canal, sus fuentes, los estados individuales de esas fuentes y sus noticias historicas.

#### Scenario: Desactivar un canal activo
- **WHEN** se elimina un canal existente con `activo=true`
- **THEN** el sistema lo conserva con `activo=false`, no modifica sus fuentes ni noticias y responde `204` sin cuerpo

#### Scenario: Repetir la desactivacion
- **WHEN** se elimina un canal existente que ya tiene `activo=false`
- **THEN** el sistema conserva su estado y responde nuevamente `204` sin cuerpo

#### Scenario: Eliminar un canal inexistente
- **WHEN** se intenta eliminar un identificador que no corresponde a un canal
- **THEN** el sistema responde `404`

#### Scenario: Reactivar un canal desactivado
- **WHEN** se actualiza mediante `PATCH` un canal desactivado con `activo=true`
- **THEN** el sistema reactiva el canal sin alterar los estados individuales de sus fuentes

## MODIFIED Requirements

### Requirement: Alta atomica de canal y fuentes RSS
El sistema SHALL exponer `POST /api/v1/sources` para crear un canal con `nombre`, `continente`, `pais`, `url_sitio` y `activo` y asociarle una o mas fuentes RSS en una unica operacion. `pais` y `url_sitio` SHALL ser opcionales y `activo` SHALL ser `true` por defecto. La solicitud MUST incluir exactamente una referencia de canal: los datos de un canal nuevo o el identificador de un canal existente. La operacion MUST ser atomica y responder `201` con el canal y las fuentes creadas.

#### Scenario: Crear un canal con una fuente
- **WHEN** se envia un canal nuevo con nombre y continente validos, sin pais, sitio ni estado explicito, y una fuente RSS valida
- **THEN** el sistema persiste el canal activo con sus campos opcionales nulos, asocia la fuente y responde `201`

#### Scenario: Crear un canal con varias fuentes
- **WHEN** se envia un canal nuevo con nombre, continente, pais, URL de sitio y estado validos y dos o mas fuentes RSS validas
- **THEN** el sistema persiste todos los datos del canal y las fuentes asociadas en una unica transaccion

#### Scenario: Asociar fuentes a un canal existente
- **WHEN** se envia el identificador de un canal existente y una o mas fuentes RSS validas
- **THEN** el sistema conserva el canal y crea las fuentes asociadas a el

#### Scenario: Rechazar una solicitud sin fuentes
- **WHEN** la solicitud de alta no contiene ninguna fuente RSS
- **THEN** el sistema no persiste el canal ni fuentes y responde `400`

#### Scenario: Revertir un alta parcialmente invalida
- **WHEN** algun dato del canal o alguna fuente incluida en el alta incumple una validacion o restriccion de unicidad
- **THEN** el sistema responde `400` y no persiste ninguna parte de la solicitud

### Requirement: Datos y dominios del canal
Cada canal SHALL exponer un identificador, nombre unico, continente, pais opcional, URL de sitio opcional, estado activo y fecha de alta. El continente MUST pertenecer al dominio `Africa`, `America`, `Antartida`, `Asia`, `Europa` u `Oceania`. Cuando se proporcione, el pais MUST contener exactamente dos letras, SHALL normalizarse a mayusculas y MUST NOT validarse contra un catalogo ISO externo. La URL de sitio MUST usar HTTP o HTTPS. El canal MUST quedar activo por defecto y `id_canal` y `fecha_alta` MUST ser de solo lectura.

#### Scenario: Crear canal con datos minimos
- **WHEN** se crea un canal con un nombre no utilizado y un continente valido
- **THEN** el sistema almacena el canal activo con pais y sitio nulos y responde con todos sus campos observables

#### Scenario: Normalizar el pais
- **WHEN** se crea o actualiza un canal con un pais valido en minusculas
- **THEN** el sistema persiste y devuelve el codigo con dos letras mayusculas

#### Scenario: Rechazar un pais invalido
- **WHEN** se intenta crear o actualizar un canal con un pais que no contiene exactamente dos letras
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar una URL de sitio invalida
- **WHEN** se intenta crear o actualizar un canal con una URL de sitio que no usa HTTP ni HTTPS
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar continente fuera del dominio
- **WHEN** se intenta crear un canal con un continente distinto de los seis valores admitidos
- **THEN** el sistema responde `400` y no crea el canal

#### Scenario: Rechazar nombre de canal duplicado
- **WHEN** se intenta crear un canal cuyo nombre ya pertenece a otro canal
- **THEN** el sistema responde `400` y no crea registros adicionales

### Requirement: Datos y dominios de la fuente RSS
Cada fuente RSS SHALL exponer un identificador, identificador de canal, nombre, URL de feed globalmente unica, categoria IPTC de primer nivel, idioma, estado activo, fecha de ultima captura opcional y fecha de alta. El idioma MUST ser `es` o `en`, la fuente MUST quedar activa por defecto y ambas fechas MUST ser de solo lectura en este CRUD.

#### Scenario: Registrar una fuente RSS valida
- **WHEN** se registra una fuente con nombre, URL valida y unica, categoria IPTC admitida e idioma `es` o `en`
- **THEN** la fuente queda asociada al canal, activa por defecto, con fecha de alta informada y fecha de ultima captura nula

#### Scenario: Consultar una fuente capturada
- **WHEN** se consulta una fuente que ya fue procesada correctamente
- **THEN** la respuesta incluye su fecha de alta y su fecha de ultima captura persistidas

#### Scenario: Rechazar fechas administradas por el servidor
- **WHEN** un cliente intenta establecer la fecha de alta o la fecha de ultima captura mediante este CRUD
- **THEN** esos campos no forman parte de los esquemas de escritura y el cliente no puede modificarlos

#### Scenario: Rechazar URL de feed duplicada
- **WHEN** la URL indicada ya pertenece a cualquier otra fuente del sistema
- **THEN** el sistema responde `400` y no crea ni modifica la fuente

#### Scenario: Rechazar idioma no soportado
- **WHEN** una fuente declara un idioma diferente de `es` o `en`
- **THEN** el sistema responde `400` y no persiste la fuente

#### Scenario: No descargar el feed durante el alta
- **WHEN** una fuente tiene una URL sintacticamente valida
- **THEN** el sistema permite registrarla sin descargar ni procesar contenido remoto

### Requirement: Consulta de fuentes RSS
El sistema SHALL exponer `GET /api/v1/sources` y `GET /api/v1/sources/{source_id}`. Cada representacion de fuente MUST incluir sus datos completos y la representacion completa del canal asociado. El listado MUST admitir los filtros opcionales existentes `continent` y `active`, y los filtros adicionales `channel_id` y `country`; cuando se combinen, MUST aplicar todos los predicados indicados.

#### Scenario: Listar fuentes
- **WHEN** se consulta `GET /api/v1/sources` sin filtros
- **THEN** el sistema responde `200` con todas las fuentes registradas y sus canales asociados, incluidos sus campos de lectura

#### Scenario: Filtrar fuentes activas por continente
- **WHEN** se consulta el listado indicando un continente valido y estado activo
- **THEN** el sistema responde `200` solo con las fuentes que satisfacen ambos filtros

#### Scenario: Filtrar fuentes por canal
- **WHEN** se consulta el listado con `channel_id` valido
- **THEN** el sistema responde `200` con las fuentes asociadas a ese canal o una lista vacia si no tiene fuentes

#### Scenario: Filtrar fuentes por pais
- **WHEN** se consulta el listado con `country` valido en minusculas o mayusculas
- **THEN** el sistema normaliza el codigo y responde `200` solo con las fuentes cuyos canales pertenecen a ese pais

#### Scenario: Combinar filtros de fuentes
- **WHEN** se indican dos o mas filtros validos
- **THEN** el sistema responde solamente con las fuentes que satisfacen simultaneamente todos ellos

#### Scenario: Consultar una fuente existente
- **WHEN** se consulta el identificador de una fuente registrada
- **THEN** el sistema responde `200` con la fuente y todos los campos observables de su canal

#### Scenario: Consultar una fuente inexistente
- **WHEN** se consulta un identificador que no corresponde a una fuente
- **THEN** el sistema responde `404`

### Requirement: Contrato REST documentado y sin autenticacion
Todos los endpoints de esta capacidad SHALL estar disponibles bajo `/api/v1`, usar JSON cuando exista cuerpo, permanecer accesibles sin autenticacion y aparecer en `/api/docs` con esquemas, filtros, ejemplos y codigos `200`, `201`, `204`, `400`, `404` y `500` segun corresponda.

#### Scenario: Revisar el contrato en Swagger
- **WHEN** se abre `/api/docs`
- **THEN** se muestran todas las operaciones de `/api/v1/sources` y `/api/v1/channels`, sus entradas, filtros, respuestas y errores documentados

#### Scenario: Ejecutar una operacion sin credenciales
- **WHEN** un cliente invoca cualquier operacion de `/api/v1/sources` o `/api/v1/channels` sin cabecera de autenticacion
- **THEN** el sistema procesa la solicitud conforme a sus datos sin exigir inicio de sesion

### Requirement: Persistencia verificable
Los canales y fuentes creados o modificados SHALL persistir en PostgreSQL y continuar disponibles tras reiniciar el proceso de la API. La funcionalidad MUST poder ejecutarse en el entorno Docker y sus pruebas API-BD MUST ejecutarse en CI contra PostgreSQL.

#### Scenario: Recuperar datos tras reiniciar la API
- **WHEN** se crea o actualiza un canal o una fuente, se reinicia el proceso de la API sin eliminar el volumen de datos y se consulta nuevamente
- **THEN** el sistema devuelve los mismos identificadores, metadatos y estados persistidos

#### Scenario: Ejecutar pruebas de integracion
- **WHEN** se ejecuta el pipeline asociado al cambio
- **THEN** las pruebas de integracion de `/sources` y `/channels` se ejecutan contra PostgreSQL y finalizan correctamente
