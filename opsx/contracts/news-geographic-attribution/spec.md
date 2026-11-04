# news-geographic-attribution Specification

## Purpose

Atribuir cada noticia a los países mencionados en su contenido, conservar la procedencia de la decisión y proporcionar una pertenencia geográfica estable para consultas y agregados.

## Requirements

### Requirement: Catálogo geográfico versionado y reproducible
El sistema SHALL disponer de un catálogo persistido que incluya todos los países y territorios con código ISO-2 oficial, sus nombres y exactamente uno de los seis continentes admitidos. Un código sin reconocimiento ISO-2 oficial MUST quedar excluido salvo que exista una inclusión manual explícita en la curación versionada. El catálogo SHALL incluir aliases en español o inglés clasificados como `pais`, `gentilicio` o `ciudad` y SHALL incorporar como ciudades únicamente aquellas con población igual o superior a 100.000 habitantes y todas las capitales, aunque no alcancen ese umbral.

El catálogo SHALL generarse como un artefacto versionado y determinista a partir de fuentes identificadas y datos curados; su carga MUST ser idempotente y la clasificación en runtime MUST NOT depender de servicios externos. Los países transcontinentales o cuya región de origen no coincida directamente con el dominio de HumWorld SHALL recibir su único continente mediante una resolución curada y versionada.

El catálogo MUST excluir aliases vacíos, códigos ISO usados como aliases automáticos, palabras comunes identificadas durante la curación y aliases que, después de normalizar idioma, mayúsculas y tildes, apunten a más de un país, salvo que exista una resolución manual explícita. Las formas de género o número que deban reconocerse SHALL existir como aliases explícitos.

#### Scenario: Cargar el catálogo en una base limpia
- **WHEN** se ejecuta el seed geográfico sobre una base sin países ni aliases
- **THEN** se persisten los países y aliases del artefacto versionado con sus idiomas, tipos y continentes

#### Scenario: Incluir países y territorios oficiales
- **WHEN** la fuente identificada contiene un país o territorio con código ISO-2 oficial
- **THEN** el artefacto generado conserva ese código con un continente canónico del dominio de HumWorld

#### Scenario: Excluir un código no oficial no curado
- **WHEN** una entrada geográfica no tiene código ISO-2 oficial y tampoco existe una inclusión manual versionada
- **THEN** el generador la excluye del catálogo soportado

#### Scenario: Filtrar ciudades por población y capitalidad
- **WHEN** se genera el catálogo de aliases de ciudad
- **THEN** se incluyen las ciudades con población igual o superior a 100.000 habitantes
- **AND** se incluyen todas las capitales aunque tengan una población inferior
- **AND** se excluyen las demás ciudades

#### Scenario: Repetir la carga
- **WHEN** se ejecuta nuevamente el seed sobre el mismo catálogo ya cargado
- **THEN** no se duplican países ni aliases y se conserva el mismo contenido funcional

#### Scenario: Clasificar sin red externa
- **WHEN** se procesa una noticia con el catálogo cargado y sin acceso a GeoNames, REST Countries u otra API remota
- **THEN** la atribución utiliza exclusivamente los datos locales persistidos

#### Scenario: Rechazar un catálogo no utilizable
- **WHEN** se intenta clasificar una noticia sin una versión válida del catálogo o sin aliases aplicables a su idioma
- **THEN** el procesamiento falla de forma explícita y no convierte silenciosamente todas las noticias en respaldos por fuente

### Requirement: Reconocimiento geográfico con prioridad del título
El sistema SHALL normalizar el título y los aliases sin distinguir mayúsculas ni tildes, respetar límites de palabra y comparar solamente aliases del idioma de la noticia. SHALL usar todos los países reconocidos en el título y MUST consultar la descripción solamente cuando el título no produzca ningún país. La clasificación MUST limitarse al título y la descripción persistidos y MUST NOT descargar el cuerpo remoto del artículo.

Cuando varias coincidencias se solapen, el sistema SHALL conservar la coincidencia de mayor longitud. SHALL resolver nombres de país, gentilicios y ciudades al país canónico del alias, y SHALL deduplicar coincidencias que resuelvan al mismo país.

#### Scenario: Resolver una ciudad del título
- **WHEN** una noticia en español contiene `Gaza` en el título y ese alias de ciudad resuelve a `PS`
- **THEN** la noticia queda atribuida a `PS` por mención

#### Scenario: Reconocer sin distinguir mayúsculas ni tildes
- **WHEN** el texto contiene una variante de mayúsculas o tildes de un alias explícito del idioma de la noticia
- **THEN** el sistema reconoce el país canónico asociado al alias

#### Scenario: Priorizar el título sobre la descripción
- **WHEN** el título produce al menos un país y la descripción contiene aliases de otros países
- **THEN** la atribución usa solamente los países reconocidos en el título

#### Scenario: Usar la descripción como segundo nivel
- **WHEN** el título no produce países y la descripción produce uno o más países
- **THEN** la noticia queda atribuida a los países reconocidos en la descripción

#### Scenario: Preferir la frase más larga
- **WHEN** una frase contiene aliases solapados como un nombre de país compuesto y una parte de ese nombre
- **THEN** el sistema conserva la coincidencia más larga y no atribuye el fragmento solapado por separado

#### Scenario: Atribuir una noticia multinacional
- **WHEN** el nivel de texto elegido contiene aliases no ambiguos de Chile y Argentina
- **THEN** la noticia queda atribuida una vez a `CL` y una vez a `AR`

#### Scenario: Deduplicar aliases del mismo país
- **WHEN** el nivel de texto elegido contiene una ciudad y un nombre de país que resuelven al mismo código
- **THEN** se conserva una sola atribución para ese país

### Requirement: Respaldo geográfico por fuente
El sistema SHALL usar el país del canal como respaldo con origen `fuente` únicamente cuando el título y la descripción no produzcan ningún país. Si el canal tampoco tiene país, la noticia SHALL quedar marcada como geográficamente procesada sin asociación de país y SHALL continuar perteneciendo al continente de la fuente.

#### Scenario: Usar el país de la fuente
- **WHEN** una noticia no contiene aliases geográficos y su canal pertenece a `CL`
- **THEN** la noticia queda atribuida una vez a `CL` con origen `fuente`

#### Scenario: No mezclar mención y respaldo
- **WHEN** una noticia menciona `AR` y proviene de un canal de `CL`
- **THEN** queda atribuida a `AR` con origen `mencion`
- **AND** no se crea una atribución adicional a `CL` por fuente

#### Scenario: Conservar una noticia de canal sin país
- **WHEN** una noticia no contiene menciones y su canal tiene continente pero país nulo
- **THEN** queda registrada como geográficamente procesada sin país
- **AND** participa en el continente de la fuente

### Requirement: Persistencia auditable e independiente del sentimiento
Para cada noticia procesada, el sistema SHALL persistir la fecha y versión de clasificación geográfica. Cada país atribuido SHALL conservar un origen `mencion` o `fuente`; una atribución por mención SHALL conservar evidencia del alias y del nivel `titulo` o `descripcion`, mientras una atribución por fuente SHALL conservar el país de respaldo sin presentar un alias textual. La ausencia de países después de una clasificación válida MUST distinguirse de una noticia todavía pendiente de clasificación.

La clasificación geográfica MUST NOT cambiar `valor_humor`, los términos reconocidos ni la fórmula de sentimiento.

#### Scenario: Guardar evidencia de una mención
- **WHEN** un alias del título resuelve a un país
- **THEN** la asociación persistida identifica el país, el origen `mencion`, el alias y el nivel `titulo`

#### Scenario: Registrar una clasificación sin país
- **WHEN** no existen menciones ni país de respaldo
- **THEN** la noticia conserva fecha y versión de clasificación sin asociaciones de país

#### Scenario: Mantener el sentimiento existente
- **WHEN** una noticia recibe una o más atribuciones geográficas
- **THEN** su humor y desglose de términos permanecen determinados exclusivamente por el análisis de sentimiento vigente

### Requirement: Backfill y reclasificación idempotentes
El sistema SHALL poder clasificar noticias históricas por lotes usando las mismas reglas que las noticias nuevas. Una ejecución SHALL seleccionar noticias sin clasificación o con una versión anterior a la versión objetivo y SHALL reemplazar atómicamente sus asociaciones derivadas. Repetir la misma versión MUST NOT duplicar asociaciones ni cambiar resultados equivalentes.

#### Scenario: Clasificar noticias históricas
- **WHEN** se ejecuta el backfill sobre noticias sin versión geográfica
- **THEN** cada noticia queda clasificada con las reglas y versión vigentes

#### Scenario: Repetir el backfill
- **WHEN** se ejecuta nuevamente el backfill con la misma versión sobre noticias ya actualizadas
- **THEN** no se duplican asociaciones y las noticias ya vigentes no requieren recálculo

#### Scenario: Aplicar una versión nueva
- **WHEN** se ejecuta el backfill con una versión posterior del catálogo
- **THEN** las asociaciones de cada noticia procesada se reemplazan atómicamente por el nuevo resultado

### Requirement: Semántica geográfica de los dashboards
Las consultas geográficas del dashboard SHALL resolver la pertenencia por las atribuciones persistidas. Una noticia evaluable atribuida a varios países SHALL contribuir una vez completa a cada país, una vez a cada continente distinto representado por esos países y una sola vez en consultas sin ámbito geográfico. Una noticia clasificada sin país SHALL contribuir únicamente al continente de su fuente.

Los filtros y agregados MUST evitar que una relación muchos-a-muchos multiplique una noticia dentro del mismo país, continente o ámbito global. Esta regla SHALL aplicarse al humor agregado, conteos, evolución diaria, términos influyentes y ranking de noticias influyentes.

#### Scenario: Contar dos países del mismo continente
- **WHEN** una noticia evaluable está atribuida a `CL` y `AR`
- **THEN** contribuye una vez al agregado de Chile y una vez al agregado de Argentina
- **AND** contribuye una sola vez al agregado de América

#### Scenario: Contar países de continentes distintos
- **WHEN** una noticia evaluable está atribuida a países de dos continentes
- **THEN** contribuye una vez a cada uno de esos continentes
- **AND** contribuye una sola vez en una consulta sin filtro geográfico

#### Scenario: No duplicar términos ni evolución
- **WHEN** una noticia tiene varios países dentro del ámbito consultado
- **THEN** sus términos persistidos y su valor diario contribuyen una sola vez a ese ámbito

#### Scenario: Filtrar por un país mencionado
- **WHEN** una noticia proviene de `CL`, está atribuida por mención a `PS` y se consulta el país `PS`
- **THEN** la noticia participa en la consulta
- **AND** no participa al consultar `CL` salvo que también esté atribuida explícitamente a `CL`

### Requirement: Compatibilidad de los contratos del dashboard
El sistema SHALL conservar las rutas, parámetros y formas de respuesta vigentes de los endpoints del dashboard. En cada elemento de noticias influyentes, los campos singulares `canal`, `continente` y `pais` SHALL continuar describiendo la fuente editorial, mientras la inclusión en el ranking y la aplicación de filtros SHALL usar la atribución geográfica de la noticia.

#### Scenario: Consultar noticias influyentes por país atribuido
- **WHEN** se filtra el ranking por un país mencionado distinto del país del canal
- **THEN** la noticia puede aparecer en el resultado por su atribución
- **AND** sus campos `continente` y `pais` conservan la geografía del canal para mantener el contrato existente

#### Scenario: Mantener las respuestas existentes
- **WHEN** un consumidor consulta cualquiera de los endpoints actuales del dashboard después del cambio
- **THEN** recibe los mismos campos y tipos publicados antes del cambio

### Requirement: Lectura de entradas geográficas dentro de ámbitos autorizados

El generador geográfico SHALL admitir fuentes REST Countries y GeoNames únicamente dentro de `data/geography/sources` del backend instalado. La curación y los catálogos leídos por el seed SHALL pertenecer a `data/geography` del mismo backend. Ambos ámbitos incluyen subdirectorios, son fijos y MUST NOT poder ampliarse mediante argumentos de consola o variables de entorno.

Antes de leer una entrada, el sistema SHALL comprobar que su ruta efectiva resuelve a un archivo regular existente dentro del ámbito correspondiente. SHALL rechazar escapes por rutas absolutas externas, segmentos relativos, enlaces simbólicos o junctions, así como redirecciones de las propias raíces fuera de su ubicación prevista. La política SHALL proteger también la lectura directa de JSON, texto, ZIP y cálculo de checksums, cuyo ámbito genérico máximo es `data/geography`; los consumidores de fuentes externas SHALL conservar el límite más estrecho de `sources`.

El generador SHALL validar todas las entradas informadas antes de leer la primera. Una entrada rechazada SHALL producir un fallo explícito sin publicar salidas; un catálogo rechazado SHALL impedir el inicio del seed y sus modificaciones de base de datos. Las entradas autorizadas SHALL conservar la generación determinista y la carga idempotente existentes, y el arranque Docker SHALL continuar utilizando el catálogo predeterminado sin necesitar las fuentes descargadas.

#### Scenario: Generar con fuentes preparadas en el ámbito fijo
- **WHEN** el operador usa fuentes existentes de `data/geography/sources`, curación interna y destinos de salida autorizados
- **THEN** se permite la generación y se conservan catálogo y manifiesto deterministas para las mismas entradas
- **AND** el argumento opcional de nombres alternativos puede omitirse

#### Scenario: Aceptar rutas absolutas internas y subdirectorios
- **WHEN** una entrada se expresa mediante una ruta absoluta interna o una ruta relativa que resuelve a un archivo dentro de su ámbito
- **THEN** se acepta la entrada con la misma semántica de contenido

#### Scenario: Rechazar fuentes fuera del subdirectorio de fuentes
- **WHEN** una entrada REST Countries o GeoNames está fuera de `data/geography/sources`, aunque pertenezca a otra ubicación de `data/geography`
- **THEN** el generador rechaza esa entrada antes de leer las fuentes

#### Scenario: Rechazar rutas externas y directorios hermanos
- **WHEN** una entrada resuelve fuera de su ámbito mediante una ruta absoluta, segmentos `..` o un directorio hermano con prefijo común como `sources-extra`
- **THEN** la ejecución falla sin abrir el archivo externo ni publicar salidas o iniciar el seed

#### Scenario: Rechazar enlaces que escapan del ámbito
- **WHEN** una entrada o un directorio padre es un enlace simbólico o junction que resuelve a un archivo externo
- **THEN** la entrada se rechaza antes de abrir el archivo externo

#### Scenario: Rechazar una raíz redirigida
- **WHEN** la raíz autorizada o sus ancestros están redirigidos de forma que la raíz efectiva queda fuera de su ubicación prevista
- **THEN** el sistema rechaza la entrada y no considera el destino del enlace como un nuevo ámbito autorizado

#### Scenario: Rechazar entradas inexistentes o especiales
- **WHEN** la entrada no existe, no puede resolverse o corresponde a un directorio, dispositivo u otro archivo no regular
- **THEN** se informa un error explícito antes de intentar leer su contenido

#### Scenario: Validar una entrada posterior antes de leer la primera
- **WHEN** las primeras rutas del generador son válidas y una entrada posterior, incluido el archivo opcional si se informa, no está autorizada
- **THEN** se rechaza la ejecución sin leer ninguna fuente ni modificar catálogo o manifiesto existentes

#### Scenario: Proteger las operaciones invocadas directamente
- **WHEN** se invoca directamente desde Python una operación de lectura JSON, texto o ZIP, cálculo de checksum o carga de catálogo con una ruta externa a `data/geography`
- **THEN** la operación rechaza la ruta antes de abrir el archivo
- **AND** la generación invocada directamente sigue aplicando el ámbito específico de cada entrada

#### Scenario: Leer ZIP autorizado sin extraer archivos
- **WHEN** una fuente GeoNames autorizada es un ZIP compatible con la selección de miembro existente
- **THEN** se procesa el contenido sin extraer archivos al sistema de archivos y se conserva el resultado funcional

#### Scenario: Conservar el arranque Docker y la carga repetida
- **WHEN** Docker inicia el backend con su catálogo predeterminado y sin fuentes descargadas presentes
- **THEN** el seed carga el catálogo versionado y el backend puede atender las consultas del dashboard
- **AND** repetir el seed con el mismo catálogo no duplica países ni aliases

#### Scenario: Rechazar un catálogo externo antes de iniciar el seed
- **WHEN** el operador informa un catálogo fuera de `data/geography`
- **THEN** el comando falla antes de iniciar la sesión de seed y los países y aliases existentes permanecen intactos

### Requirement: Publicación del catálogo dentro del ámbito autorizado

El generador SHALL permitir escribir el catálogo y el manifiesto únicamente dentro del directorio `data/geography` del backend instalado, incluidos sus subdirectorios. Ese ámbito MUST ser fijo para la ejecución productiva y MUST NOT ampliarse mediante argumentos CLI o variables de entorno. La autorización SHALL basarse en la ubicación efectiva del destino, contemplando rutas normalizadas y enlaces existentes, y MUST rechazar una raíz redirigida fuera de la ubicación autorizada.

El generador MUST validar ambos destinos antes de crear directorios o escribir archivos de salida. SHALL rechazar destinos externos, destinos que sean directorios, destinos coincidentes para catálogo y manifiesto y rutas cuya ubicación no pueda validarse. Ante ese rechazo, el CLI SHALL terminar con código distinto de cero y un mensaje legible; MUST conservar intactos los archivos existentes y no crear directorios de salida. La misma restricción SHALL aplicarse al invocar directamente la operación de escritura.

Las rutas relativas SHALL conservar su interpretación respecto del directorio de trabajo. Las rutas absolutas internas SHALL seguir siendo válidas. La generación autorizada SHALL mantener la serialización determinista existente y permitir actualizar archivos JSON existentes, sin modificar por esa escritura el contenido de un archivo externo enlazado al destino.

#### Scenario: Mantener la generación documentada
- **WHEN** el operador ejecuta el generador desde `backend/` con `data/geography/catalog.json` y `data/geography/manifest.json`
- **THEN** se publican ambos JSON dentro del ámbito autorizado
- **AND** las mismas entradas producen los mismos bytes que la serialización vigente

#### Scenario: Aceptar destinos absolutos internos y subdirectorios
- **WHEN** ambos destinos efectivos son archivos distintos dentro del ámbito autorizado, usando rutas absolutas o subdirectorios nuevos
- **THEN** se permite la generación y se crean únicamente los padres internos necesarios

#### Scenario: Rechazar un escape por segmentos relativos o ruta absoluta
- **WHEN** un destino resuelve fuera del ámbito mediante `..` o una ruta absoluta externa
- **THEN** se rechaza la ejecución antes de generar efectos de salida
- **AND** un archivo externo preexistente conserva exactamente su contenido

#### Scenario: Rechazar directorios hermanos con prefijo común
- **WHEN** un destino pertenece a un directorio hermano como `geography-extra` en lugar de `geography`
- **THEN** el generador lo rechaza como destino externo aunque el texto de su ruta comparta prefijo

#### Scenario: Rechazar enlaces que redirigen fuera
- **WHEN** el destino o un directorio padre existente es un enlace simbólico o junction que resuelve fuera del ámbito
- **THEN** se rechaza la ejecución y el archivo externo permanece intacto
- **AND** no se crean nuevos directorios de salida

#### Scenario: Rechazar la redirección de la propia raíz
- **WHEN** el directorio geográfico previsto está redirigido fuera de su ubicación autorizada mediante un enlace
- **THEN** el generador rechaza las salidas y no usa el destino del enlace como una nueva autorización

#### Scenario: Validar el segundo destino antes de publicar el primero
- **WHEN** el destino del catálogo es válido y el del manifiesto es externo o no validable
- **THEN** la ejecución falla sin modificar el catálogo existente ni crear sus directorios pendientes

#### Scenario: Rechazar destinos coincidentes
- **WHEN** los destinos del catálogo y del manifiesto resuelven al mismo archivo
- **THEN** la ejecución falla antes de escribir cualquiera de los dos artefactos

#### Scenario: Proteger la invocación directa de escritura
- **WHEN** se invoca directamente la operación de escritura con un destino externo
- **THEN** la operación falla sin crear directorios ni modificar archivos externos

#### Scenario: Preservar un archivo externo con hard link interno
- **WHEN** un destino autorizado existente comparte un hard link con un archivo externo y se publica un JSON nuevo
- **THEN** el archivo externo conserva su contenido original
- **AND** el artefacto interno contiene el JSON generado
