## ADDED Requirements

### Requirement: Desglose de términos por noticia
El sistema SHALL exponer `GET /api/v1/dashboards/noticias/{id}/terminos`, que devuelve `valor_humor` (el valor guardado de la noticia) y `terminos`, con `id_termino`, `palabra`, `valor`, `ocurrencias` y `aporte_humor` por cada término detectado. `valor` SHALL ser `aporte_humor / ocurrencias`, no el valor vigente del diccionario. `terminos` SHALL incluir también los términos hoy inactivos y SHALL ordenarse por valor absoluto de `aporte_humor` descendente y luego por `palabra` ascendente.

#### Scenario: Consultar el desglose de una noticia analizada
- **WHEN** se consulta una noticia con términos detectados
- **THEN** responde `200` con su `valor_humor` y sus términos ordenados de mayor a menor impacto

#### Scenario: Conservar el valor del momento del análisis
- **WHEN** el valor de un término del diccionario se edita después del análisis
- **THEN** `valor` sigue siendo `aporte_humor / ocurrencias` del análisis original

#### Scenario: Incluir términos desactivados
- **WHEN** un término fue desactivado después de analizar la noticia
- **THEN** sigue apareciendo en el desglose

#### Scenario: Noticia inexistente o sin analizar
- **WHEN** la noticia no existe o no fue analizada
- **THEN** responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador no es numérico
- **THEN** responde `400`

#### Scenario: Dejar intacto el ranking
- **WHEN** un consumidor consulta `GET /api/v1/dashboards/noticias-influyentes` después del cambio
- **THEN** la respuesta conserva sus campos, nombres y tipos
