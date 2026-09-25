# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
