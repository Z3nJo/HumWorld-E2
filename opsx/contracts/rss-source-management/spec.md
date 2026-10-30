## Purpose

Permitir que HumWorld registre canales y administre sus fuentes RSS categorizadas, proporcionando los origenes persistentes que consumiran la carga inicial, la captura automatica, la captura manual y el panel de administracion.

## Requirements

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
Cada canal SHALL exponer un identificador, nombre unico, continente, pais opcional, URL de sitio opcional, estado activo y fecha de alta. El continente MUST pertenecer al dominio `Africa`, `America`, `Antartida`, `Asia`, `Europa` u `Oceania`. Cuando se proporcione, el pais MUST contener exactamente dos letras, SHALL normalizarse a mayusculas, MUST existir en el catálogo geográfico soportado y MUST pertenecer al continente declarado. La validación MUST usar el catálogo local y no depender de una consulta externa en runtime. La URL de sitio MUST usar HTTP o HTTPS. El canal MUST quedar activo por defecto y `id_canal` y `fecha_alta` MUST ser de solo lectura.

#### Scenario: Crear canal con datos minimos
- **WHEN** se crea un canal con un nombre no utilizado y un continente valido
- **THEN** el sistema almacena el canal activo con pais y sitio nulos y responde con todos sus campos observables

#### Scenario: Normalizar el pais
- **WHEN** se crea o actualiza un canal con un pais soportado en minusculas y su continente correspondiente
- **THEN** el sistema persiste y devuelve el codigo con dos letras mayusculas

#### Scenario: Rechazar un pais invalido
- **WHEN** se intenta crear o actualizar un canal con un pais que no contiene exactamente dos letras
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar un pais no soportado
- **WHEN** se intenta crear o actualizar un canal con un codigo de dos letras ausente del catálogo geográfico
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar una combinacion geografica incoherente
- **WHEN** se intenta crear o actualizar un canal con un pais soportado y un continente distinto del continente canónico del país
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

### Requirement: Categoria IPTC de primer nivel
La categoria de cada fuente SHALL pertenecer al primer nivel de IPTC Media Topics: `arts/culture/entertainment/media`, `conflict/war/peace`, `crime/law/justice`, `disaster/accident`, `economy/business/finance`, `education`, `environment`, `health`, `human interest`, `labour`, `lifestyle/leisure`, `politics`, `religion`, `science/technology`, `society`, `sport` o `weather`.

#### Scenario: Aceptar una categoria IPTC admitida
- **WHEN** una fuente declara cualquiera de los 17 valores IPTC admitidos
- **THEN** el sistema conserva exactamente esa categoria en la fuente

#### Scenario: Rechazar una categoria fuera del primer nivel
- **WHEN** una fuente declara un valor que no pertenece al dominio IPTC admitido
- **THEN** el sistema responde `400` y no persiste la fuente

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

### Requirement: Reclasificación histórica por corrección del canal
Cuando se modifique el país o continente de un canal, el sistema SHALL actualizar dentro de la misma operación las atribuciones históricas con origen `fuente` de sus noticias. MUST conservar sin cambios las atribuciones con origen `mencion`. Si el nuevo país es nulo, SHALL eliminar el respaldo de país y conservar esas noticias en el nuevo continente de la fuente; si se asigna posteriormente un país válido, SHALL crear el respaldo para las noticias sin menciones.

#### Scenario: Corregir el país de la fuente
- **WHEN** un canal cambia de un país válido a otro país válido de manera coherente con su continente
- **THEN** sus noticias atribuidas por fuente dejan de pertenecer al país anterior y pasan al país nuevo
- **AND** sus noticias atribuidas por mención conservan sus países detectados

#### Scenario: Quitar el país de un canal
- **WHEN** el país de un canal se actualiza a nulo
- **THEN** se eliminan las asociaciones históricas con origen `fuente`
- **AND** esas noticias continúan perteneciendo al continente vigente del canal

#### Scenario: Completar un país antes ausente
- **WHEN** un canal con país nulo recibe un país válido
- **THEN** sus noticias ya clasificadas sin menciones reciben una asociación de respaldo al país nuevo

#### Scenario: Revertir una corrección incompleta
- **WHEN** falla la actualización de alguna atribución histórica requerida por el cambio del canal
- **THEN** se revierte también la modificación geográfica del canal

### Requirement: Catálogo inicial de fuentes RSS operativo por continente
El seed de fuentes RSS SHALL registrar exactamente una fuente activa por cada continente admitido, y para América SHALL utilizar PBS NewsHour Headlines con la URL `https://www.pbs.org/newshour/feeds/rss/headlines`, categoría IPTC `society` e idioma `en`.

#### Scenario: Inicializar una base limpia
- **WHEN** se ejecuta el seed sobre una base sin canales ni fuentes
- **THEN** se crean seis canales y seis fuentes, incluida una única fuente PBS activa asociada a América

#### Scenario: Verificar los datos de PBS
- **WHEN** se consulta la fuente de América después del seed
- **THEN** su nombre, URL, categoría, idioma y estado activo coinciden con el catálogo PBS definido

### Requirement: Reconciliación idempotente de la fuente América reemplazada
El seed SHALL reconciliar un registro legado de CBC News para América con el registro PBS definido sin crear una segunda fuente para el continente, conservando los identificadores persistentes y las relaciones existentes cuando no exista un conflicto de unicidad.

#### Scenario: Actualizar una instalación existente con CBC
- **WHEN** la base contiene la fuente CBC `https://www.cbc.ca/cmlink/rss-topstories` y no contiene PBS
- **THEN** el seed actualiza esa fuente al catálogo PBS dentro de una transacción y conserva sus identificadores y noticias relacionadas

#### Scenario: Reejecutar el seed después del reemplazo
- **WHEN** se ejecuta nuevamente el seed sobre la base ya reconciliada
- **THEN** no se crean canales ni fuentes adicionales y la fuente PBS permanece única y sin cambios

#### Scenario: Resolver un conflicto de unicidad
- **WHEN** la base contiene CBC y PBS asociados a registros incompatibles
- **THEN** el seed informa el conflicto, revierte toda la operación y no deja cambios parciales
