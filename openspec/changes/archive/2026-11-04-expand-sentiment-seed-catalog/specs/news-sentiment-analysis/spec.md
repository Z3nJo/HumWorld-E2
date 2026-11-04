## MODIFIED Requirements

### Requirement: Léxico inicial bilingüe de sentimiento
El sistema SHALL disponer de un léxico inicial curado con al menos 4.000 términos activos en español y 4.000 términos activos en inglés, incluidos los 30 pares de conceptos curatoriales existentes. Cada identidad formada por palabra normalizada e idioma MUST ser única, y cada valor MUST estar dentro de `[-10, 10]` con un máximo de un decimal efectivo para conservar su compatibilidad con el cálculo vigente. El catálogo MUST estar incorporado de forma reproducible al seed y su inicialización MUST funcionar sin descargar datos de fuentes externas durante el arranque.

#### Scenario: Inicializar el léxico en una instalación limpia
- **WHEN** se inicializa una base de datos sin términos
- **THEN** se insertan al menos 4.000 términos activos en español y 4.000 términos activos en inglés
- **AND** cada término cumple el idioma, la unicidad, el rango y la precisión exigidos

#### Scenario: Conservar los conceptos curatoriales existentes
- **WHEN** se inicializa el léxico ampliado
- **THEN** los 30 pares de conceptos españoles e ingleses del léxico original permanecen presentes con sus valores y estados definidos

#### Scenario: Repetir la inicialización del léxico
- **WHEN** se ejecuta nuevamente la inicialización del léxico
- **THEN** no se duplican sus términos ni se reemplazan valores o estados existentes, incluidos cambios realizados por un administrador

#### Scenario: Inicializar sin depender de la red
- **WHEN** se inicializa el léxico en un entorno sin acceso a las fuentes externas de datos
- **THEN** el catálogo completo se carga desde el seed versionado sin realizar descargas

#### Scenario: Usar el léxico según el idioma de la noticia
- **WHEN** una noticia analizada contiene una forma canónica o flexionada de un término del léxico inicial
- **THEN** solo contribuyen los términos correspondientes al idioma de la noticia y sus aportes quedan asociados a la entrada canónica
