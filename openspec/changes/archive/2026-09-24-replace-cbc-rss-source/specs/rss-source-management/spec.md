## ADDED Requirements

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
