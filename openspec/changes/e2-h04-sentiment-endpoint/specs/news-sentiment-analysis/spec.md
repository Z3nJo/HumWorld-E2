# Spec Delta

## ADDED Requirements

### Requirement: Análisis de sentimiento de texto puntual por API
El sistema SHALL exponer `POST /api/v1/sentiment` para analizar texto libre sin crear ni modificar noticias. La solicitud SHALL incluir `texto` e `idioma`, limitado a `es` o `en`. `texto` MUST contener al menos un carácter no blanco y MUST tener como máximo 10.000 caracteres; el sistema MUST rechazar texto inválido sin truncarlo. Para una solicitud válida, el sistema SHALL usar los términos activos del idioma solicitado y los parámetros vigentes del mismo reconocedor y función de cálculo empleados por el análisis de noticias. SHALL responder `200` con `valor_humor` y `terminos`, cuyo desglose SHALL incluir para cada término canónico reconocido `id_termino`, `palabra`, `valor`, `ocurrencias` y `aporte_humor`. La operación MUST NOT persistir el texto ni el resultado. Si no se reconocen términos, `valor_humor` SHALL ser `null` y `terminos` SHALL ser una lista vacía; un resultado neutral con términos reconocidos SHALL ser `0`. El endpoint y sus esquemas SHALL estar documentados en OpenAPI bajo `/api/v1` y disponibles en `/api/docs`.

#### Scenario: Analizar texto con términos reconocidos
- **WHEN** se envía texto válido en `es` o `en` con al menos un término activo de ese idioma
- **THEN** el endpoint responde `200` con el valor calculado por el algoritmo vigente y el desglose asociado a los términos canónicos reconocidos

#### Scenario: Distinguir ausencia de términos de neutralidad
- **WHEN** el texto válido no contiene términos activos del idioma indicado
- **THEN** la respuesta contiene `valor_humor: null` y `terminos: []`
- **AND** cuando términos reconocidos se cancelan, la respuesta conserva `valor_humor: 0` y el desglose de esos términos

#### Scenario: Rechazar idioma o texto inválido
- **WHEN** la solicitud omite o envía un idioma distinto de `es` o `en`, texto vacío o compuesto solo por espacios, o texto de más de 10.000 caracteres
- **THEN** el endpoint responde `400` y no analiza una versión truncada del texto

#### Scenario: No persistir el análisis puntual
- **WHEN** se procesa una solicitud válida
- **THEN** no se crea ni modifica una noticia, una fecha de análisis ni filas de términos persistidos

#### Scenario: Mantener paridad con el análisis persistido
- **WHEN** se envía al endpoint el texto formado por el título y la descripción de una noticia ya analizada, junto con el idioma de esa noticia
- **THEN** `valor_humor` coincide con el valor persistido para esa noticia y el desglose corresponde a sus términos reconocidos

#### Scenario: Publicar el contrato del endpoint
- **WHEN** un consumidor consulta la documentación OpenAPI de la API
- **THEN** encuentra `POST /api/v1/sentiment`, sus esquemas de solicitud y respuesta y sus códigos de respuesta aplicables
