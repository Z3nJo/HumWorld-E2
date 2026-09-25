# Spec Delta

## MODIFIED Requirements

### Requirement: Reconocimiento de términos en noticias
El sistema SHALL analizar `titulo` seguido de `descripcion`, separados por un espacio cuando exista descripción, sin descargar el cuerpo del artículo. SHALL contar las apariciones completas de cada término activo cuyo idioma coincida con el de la noticia, sin distinguir mayúsculas ni tildes. SHALL reconocer formas flexionadas comunes en español e inglés como apariciones del término canónico correspondiente, conservando ese término para el cálculo y el desglose. Las coincidencias MUST respetar límites de palabra y MUST NOT incluir términos inactivos ni términos de otro idioma.

#### Scenario: Reconocer términos del idioma de la noticia
- **WHEN** el título y la descripción de una noticia `es` contienen dos apariciones completas de un término español activo, con diferencias de mayúsculas o tildes
- **THEN** el análisis reconoce ese término con dos ocurrencias

#### Scenario: Reconocer términos del idioma inglés
- **WHEN** el título y la descripción de una noticia `en` contienen apariciones completas de términos ingleses activos, incluyendo diferencias de mayúsculas
- **THEN** el análisis reconoce esas apariciones y las asocia a sus términos canónicos ingleses

#### Scenario: Reconocer una forma flexionada común
- **WHEN** una noticia `es` contiene una forma flexionada común de un término español activo o una noticia `en` contiene una forma flexionada común de un término inglés activo
- **THEN** el análisis contabiliza la aparición bajo el término canónico activo correspondiente

#### Scenario: Excluir términos no aplicables
- **WHEN** el texto contiene un término inactivo, uno registrado solo en otro idioma o una coincidencia que es parte de una palabra más larga
- **THEN** esas coincidencias no contribuyen al análisis

#### Scenario: Analizar una noticia sin descripción
- **WHEN** una noticia no tiene descripción
- **THEN** el análisis utiliza solamente su título
