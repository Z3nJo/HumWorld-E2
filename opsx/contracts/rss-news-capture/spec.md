## Purpose

Permitir que HumWorld capture periodicamente noticias desde todas las fuentes RSS activas, las persista con trazabilidad temporal y evite duplicados sin detener el recorrido por fallos aislados.

## Requirements

### Requirement: Programacion automatica configurable
El sistema SHALL programar la captura automatica usando el valor persistido de `captura.periodicidad_minutos` y SHALL usar el valor por defecto `60` cuando el parametro no exista. La primera ejecucion SHALL ocurrir despues de transcurrir el intervalo configurado y las ejecuciones del mismo job MUST NOT superponerse.

#### Scenario: Programar con periodicidad persistida
- **WHEN** el backend inicia con `captura.periodicidad_minutos` persistido
- **THEN** el sistema programa el job de captura con ese intervalo

#### Scenario: Programar con periodicidad por defecto
- **WHEN** el backend inicia sin un valor persistido para `captura.periodicidad_minutos`
- **THEN** el sistema programa el job de captura cada `60` minutos

#### Scenario: Evitar ejecuciones superpuestas
- **WHEN** una captura continua en curso al llegar el siguiente instante programado
- **THEN** el sistema no inicia una segunda instancia concurrente del mismo job

### Requirement: Recorrido de fuentes activas
Cada ejecucion automatica SHALL consultar y procesar solamente las fuentes RSS con `activa=true` cuyo canal asociado tenga `activo=true` al comenzar el recorrido. La ejecucion MUST excluir tanto las fuentes inactivas como las fuentes pertenecientes a canales inactivos.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** comienza una ejecucion con varias fuentes activas asociadas a canales activos
- **THEN** el sistema intenta procesar cada una de esas fuentes

#### Scenario: Excluir una fuente inactiva
- **WHEN** una fuente esta registrada con `activa=false` aunque su canal este activo
- **THEN** el sistema no descarga ni procesa su feed durante la ejecucion

#### Scenario: Excluir un canal inactivo
- **WHEN** una fuente tiene `activa=true` pero su canal asociado tiene `activo=false`
- **THEN** el sistema no descarga ni procesa su feed durante la ejecucion

#### Scenario: Reactivar un canal sin alterar las fuentes
- **WHEN** un canal vuelve a `activo=true`
- **THEN** las siguientes ejecuciones vuelven a considerar solamente sus fuentes que conservan `activa=true`

### Requirement: Normalizacion y persistencia de noticias RSS
El sistema SHALL persistir cada entrada RSS valida con `id_fuente`, `guid_origen`, `titulo`, `descripcion` opcional, `url`, el idioma heredado de la fuente, `fecha_publicacion` opcional y `fecha_registro`. `fecha_registro` SHALL representar la fecha y hora en que la noticia fue almacenada. Al completar correctamente el procesamiento de la fuente, cada noticia nueva SHALL tener `fecha_analisis` informada y `valor_humor` calculado conforme a ADR-001 o nulo si no hay términos reconocidos.

#### Scenario: Persistir una entrada RSS completa
- **WHEN** una fuente activa entrega una entrada con identificador, titulo, enlace y fecha de publicacion
- **THEN** el sistema almacena la noticia asociada a la fuente con sus datos normalizados y una `fecha_registro`
- **AND** la noticia queda analizada antes de completar correctamente la captura de esa fuente

#### Scenario: Persistir una entrada sin fecha de publicacion
- **WHEN** una entrada valida no incluye fecha de publicacion
- **THEN** el sistema almacena la noticia con `fecha_publicacion` nula y `fecha_registro` informada
- **AND** la noticia queda analizada

#### Scenario: Heredar idioma de la fuente
- **WHEN** una entrada valida es capturada desde una fuente declarada en `es` o `en`
- **THEN** la noticia queda registrada con el idioma de esa fuente

#### Scenario: Omitir una entrada sin enlace utilizable
- **WHEN** una entrada RSS no contiene un enlace utilizable para la noticia
- **THEN** el sistema omite esa entrada sin abortar el procesamiento de las restantes

### Requirement: Identificacion y control de duplicados
El sistema MUST identificar una noticia mediante `guid` cuando el item RSS lo entregue y SHALL usar su `link` como `guid_origen` en caso contrario. La combinacion `(id_fuente, guid_origen)` MUST ser unica y una captura repetida MUST NOT crear noticias adicionales para items ya registrados.

#### Scenario: Usar guid publicado por el feed
- **WHEN** una entrada RSS incluye un `guid`
- **THEN** el sistema conserva ese valor como `guid_origen`

#### Scenario: Usar enlace como identificador alternativo
- **WHEN** una entrada no incluye `guid` pero contiene un `link`
- **THEN** el sistema usa el `link` como `guid_origen`

#### Scenario: Repetir una captura
- **WHEN** se procesa nuevamente una entrada ya almacenada para la misma fuente
- **THEN** el sistema conserva una sola noticia para esa combinacion de fuente e identificador

#### Scenario: Resolver inserciones concurrentes del mismo item
- **WHEN** dos intentos tratan de insertar simultaneamente la misma combinacion de fuente e identificador
- **THEN** la base conserva una sola noticia y la ejecucion continua sin duplicarla

### Requirement: Resultado aislado por fuente
El sistema SHALL aislar el procesamiento de cada fuente. Un fallo al descargar o interpretar un feed MUST quedar registrado y MUST NOT impedir el procesamiento de las demas fuentes activas.

#### Scenario: Continuar despues de una fuente fallida
- **WHEN** una fuente activa no puede descargarse o su feed no puede interpretarse
- **THEN** el sistema registra el fallo, no persiste noticias parciales de esa fuente y continua con las restantes

#### Scenario: Completar una fuente con entradas invalidas
- **WHEN** un feed valido contiene entradas validas y entradas que no cumplen los datos minimos
- **THEN** el sistema persiste las entradas validas, omite las invalidas y continua la ejecucion

### Requirement: Registro de ultima captura por fuente
El sistema SHALL actualizar `fecha_ultima_captura` al finalizar correctamente la descarga y procesamiento de una fuente. La fecha SHALL actualizarse aunque todas las entradas hayan sido omitidas por duplicadas y MUST permanecer sin cambios cuando falle la descarga o interpretacion del feed.

#### Scenario: Actualizar fecha despues de insertar noticias
- **WHEN** una fuente se procesa correctamente y produce noticias nuevas
- **THEN** el sistema actualiza su `fecha_ultima_captura`

#### Scenario: Actualizar fecha cuando no hay novedades
- **WHEN** una fuente se procesa correctamente pero todas sus entradas ya estaban registradas
- **THEN** el sistema actualiza su `fecha_ultima_captura` sin crear duplicados

#### Scenario: Conservar fecha despues de un fallo
- **WHEN** una fuente no puede descargarse o interpretarse
- **THEN** el sistema conserva el valor anterior de `fecha_ultima_captura`

### Requirement: Confirmación atómica de captura y análisis por fuente
El sistema SHALL analizar únicamente las noticias efectivamente insertadas en una captura automática o manual y SHALL confirmar juntas, por fuente, la inserción, los resultados del análisis y la fecha de última captura. Si el análisis falla, SHALL revertir esa fuente, informarla como fallida y continuar con las demás fuentes; la respuesta de la captura manual SHALL conservar su estructura vigente.

#### Scenario: Capturar y analizar una noticia nueva
- **WHEN** una fuente entrega una noticia válida que no estaba registrada
- **THEN** el sistema la inserta, la analiza y confirma su resultado antes de informar éxito para la fuente

#### Scenario: Repetir una captura duplicada
- **WHEN** una fuente entrega un item cuyo `(id_fuente, guid_origen)` ya existe
- **THEN** el sistema no crea otra noticia ni recalcula la existente

#### Scenario: Fallar el análisis en una fuente
- **WHEN** falla el análisis de una noticia nueva de una fuente
- **THEN** se revierten las inserciones, resultados y actualización de última captura de esa fuente
- **AND** el reporte registra el error y el recorrido continúa con las otras fuentes

### Requirement: Atribución geográfica durante la captura
Cada noticia nueva SHALL completar su atribución geográfica usando la versión vigente del catálogo antes de que la fuente se informe como procesada correctamente. La inserción de la noticia, el análisis de sentimiento, la atribución geográfica y la actualización de `fecha_ultima_captura` MUST confirmarse en la misma transacción por fuente.

El sistema SHALL recuperar las clasificaciones geográficas pendientes o desactualizadas mediante un criterio independiente de `fecha_analisis`, sin recalcular el sentimiento de noticias ya analizadas solamente por requerir clasificación geográfica.

#### Scenario: Capturar, analizar y atribuir una noticia
- **WHEN** una fuente entrega una noticia válida que no estaba registrada
- **THEN** el sistema persiste su sentimiento y atribución geográfica antes de confirmar la fuente

#### Scenario: Revertir una atribución fallida
- **WHEN** falla la clasificación o persistencia geográfica de una noticia nueva
- **THEN** se revierten las noticias, resultados de sentimiento, atribuciones y actualización de última captura de esa fuente
- **AND** el recorrido continúa con las demás fuentes

#### Scenario: Procesar una clasificación pendiente sin recalcular sentimiento
- **WHEN** una noticia tiene `fecha_analisis` informada pero no tiene la versión geográfica vigente
- **THEN** el procesamiento geográfico puede clasificarla sin modificar su humor ni sus términos persistidos

#### Scenario: Fallar ante un catálogo ausente
- **WHEN** la captura intenta clasificar noticias nuevas sin un catálogo geográfico utilizable
- **THEN** la fuente se informa como fallida y no se confirma una atribución masiva por respaldo

### Requirement: Captura verificable y reproducible
La logica de captura MUST poder probarse sin acceso a Internet mediante entradas RSS controladas. La persistencia y el control de duplicados MUST verificarse contra PostgreSQL y el entorno Docker SHALL ejecutar el scheduler con las migraciones aplicadas.

#### Scenario: Probar captura sin red real
- **WHEN** se ejecutan las pruebas unitarias del modulo de captura
- **THEN** los feeds y los resultados de descarga son controlados por dobles de prueba sin depender de servicios externos

#### Scenario: Verificar persistencia en PostgreSQL
- **WHEN** se ejecutan las pruebas de integracion sobre una base migrada
- **THEN** se comprueban la persistencia de noticias, sus fechas, la unicidad compuesta y la actualizacion de la fuente

### Requirement: Captura manual de fuentes RSS
El sistema SHALL exponer `POST /api/v1/sources/capture` para ejecutar inmediatamente la captura RSS de todas las fuentes elegibles o de un subconjunto seleccionado mediante `source_ids`. Una fuente SHALL ser elegible solamente cuando tanto ella como su canal asociado esten activos.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** se solicita `POST /api/v1/sources/capture` sin identificadores
- **THEN** el sistema procesa todas las fuentes activas asociadas a canales activos
- **AND** responde con el resumen de la ejecución

#### Scenario: Capturar fuentes seleccionadas
- **WHEN** se solicita el endpoint con una lista de `source_ids` existentes, activos y asociados a canales activos
- **THEN** el sistema procesa solamente esas fuentes
- **AND** conserva la deduplicación y actualización de fecha de captura existentes

#### Scenario: Ignorar fuentes inactivas
- **WHEN** una fuente indicada existe pero tiene `activa=false`
- **THEN** el sistema no descarga su feed
- **AND** la respuesta incluye su identificador en `skipped_source_ids`

#### Scenario: Omitir una fuente seleccionada de canal inactivo
- **WHEN** una fuente indicada tiene `activa=true` pero su canal asociado tiene `activo=false`
- **THEN** el sistema no descarga su feed
- **AND** la respuesta incluye su identificador en `skipped_source_ids`

#### Scenario: Rechazar fuente inexistente
- **WHEN** la lista contiene un identificador que no existe
- **THEN** el sistema responde `404`
- **AND** no inicia la captura parcial

#### Scenario: Aislar fallos durante la captura
- **WHEN** una fuente falla al descargar o interpretar su feed
- **THEN** el sistema registra el error en su reporte
- **AND** continúa procesando las demás fuentes

### Requirement: Resultado de captura manual
La respuesta de la captura manual SHALL incluir el resultado por fuente y los totales de noticias insertadas y fuentes fallidas, y SHALL estar documentada en OpenAPI.

#### Scenario: Confirmar ejecución completada
- **WHEN** finaliza el recorrido de las fuentes seleccionadas
- **THEN** el endpoint responde `200`
- **AND** incluye `inserted`, `duplicates`, `invalid` y `error` por fuente
- **AND** incluye los totales de la ejecución

