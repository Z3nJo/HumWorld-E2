## ADDED Requirements

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
