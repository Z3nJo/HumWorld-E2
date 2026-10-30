## ADDED Requirements

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
