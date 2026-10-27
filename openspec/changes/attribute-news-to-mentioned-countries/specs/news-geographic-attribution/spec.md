## Purpose

Atribuir cada noticia a los países mencionados en su contenido, conservar la procedencia de la decisión y proporcionar una pertenencia geográfica estable para consultas y agregados.

## ADDED Requirements

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
