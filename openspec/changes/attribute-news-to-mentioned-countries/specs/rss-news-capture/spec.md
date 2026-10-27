## ADDED Requirements

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
