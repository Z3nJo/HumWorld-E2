## Purpose

Proporcionar a los consumidores del dashboard consultas verificables del humor agregado y de los términos más influyentes por periodo y ámbito geográfico.

## ADDED Requirements

### Requirement: Consulta agregada del dashboard
El sistema SHALL exponer `GET /api/v1/dashboards` con los parámetros obligatorios `fecha_desde` y `fecha_hasta` en formato `YYYY-MM-DD`, y SHALL admitir los filtros opcionales `continente` y `pais`. La respuesta `200` SHALL informar el periodo solicitado, los filtros aplicados y una lista `agregados`.

#### Scenario: Consultar todos los continentes
- **WHEN** se solicita un rango válido sin filtros geográficos
- **THEN** el endpoint responde `200` con un agregado para cada continente admitido

#### Scenario: Consultar un continente
- **WHEN** se solicita un rango válido con un `continente` admitido y sin `pais`
- **THEN** el endpoint responde `200` con el agregado del continente solicitado

#### Scenario: Consultar un país dentro de un continente
- **WHEN** se solicita un rango válido con `continente` y un `pais` de dos letras
- **THEN** el endpoint responde `200` con el agregado de las noticias que coinciden con ambos filtros

### Requirement: Semántica temporal del rango
El sistema MUST aplicar el rango de ambas consultas sobre `NOTICIA.fecha_registro`. `fecha_desde` y `fecha_hasta` SHALL representar días completos inclusivos en UTC; internamente el límite inferior SHALL ser inclusivo y el límite superior SHALL ser exclusivo al inicio UTC del día posterior a `fecha_hasta`.

#### Scenario: Incluir ambos días extremos
- **WHEN** existen noticias evaluables durante `fecha_desde`, durante días intermedios y durante `fecha_hasta`
- **THEN** todas ellas participan en el agregado y sus términos persistidos participan en la consulta de términos influyentes

#### Scenario: Excluir noticias fuera del rango
- **WHEN** existen noticias inmediatamente antes del inicio UTC de `fecha_desde` o desde el inicio UTC del día posterior a `fecha_hasta`
- **THEN** esas noticias no participan en ninguna de las dos consultas

#### Scenario: Consultar un solo día
- **WHEN** `fecha_desde` y `fecha_hasta` contienen la misma fecha
- **THEN** el sistema considera exclusivamente las noticias registradas durante ese día UTC en ambas consultas

### Requirement: Agregación geográfica del humor
El sistema SHALL calcular cada agregado como el promedio plano de los valores persistidos `NOTICIA.valor_humor` que cumplen el rango y los filtros, resolviendo la geografía mediante `NOTICIA → FUENTE_RSS → CANAL`. MUST excluir del promedio y del conteo las noticias cuyo `valor_humor` sea nulo, y SHALL redondear el humor agregado a tres decimales en la respuesta.

#### Scenario: Promediar noticias evaluables
- **WHEN** un ámbito contiene noticias evaluables con valores de humor distintos dentro del rango
- **THEN** `humor` contiene el promedio plano de esos valores redondeado a tres decimales
- **AND** `noticias` contiene la cantidad de noticias evaluables promediadas

#### Scenario: Excluir noticias sin humor
- **WHEN** un ámbito contiene noticias con `valor_humor` nulo junto con noticias evaluables
- **THEN** las noticias con valor nulo no modifican el promedio ni el campo `noticias`

#### Scenario: Conservar noticias sin país en el continente
- **WHEN** una noticia pertenece a un canal con continente informado y `pais` nulo
- **THEN** participa en el agregado de su continente
- **AND** no participa cuando se aplica un filtro por país

### Requirement: Representación del resultado y volumen
Cada elemento de `agregados` SHALL incluir `continente`, `pais`, `humor`, `noticias` y `suficiente`. Para un agregado continental, `pais` SHALL ser nulo; para un agregado por país, SHALL contener el código filtrado. `suficiente` SHALL indicar si `noticias` alcanza el valor vigente de `humor.minimo_noticias_agregacion`.

#### Scenario: Representar un ámbito sin datos
- **WHEN** ningún valor de humor evaluable coincide con un ámbito y periodo válidos
- **THEN** el agregado correspondiente contiene `humor: null`, `noticias: 0` y `suficiente: false`

#### Scenario: Representar volumen provisional
- **WHEN** el ámbito tiene al menos una noticia evaluable pero no alcanza `humor.minimo_noticias_agregacion`
- **THEN** la respuesta conserva el humor calculado y contiene `suficiente: false`

#### Scenario: Representar volumen suficiente
- **WHEN** el número de noticias evaluables alcanza o supera `humor.minimo_noticias_agregacion`
- **THEN** el agregado contiene `suficiente: true`

### Requirement: Consulta de términos influyentes
El sistema SHALL exponer `GET /api/v1/dashboards/nube-palabras` con los mismos parámetros `fecha_desde`, `fecha_hasta`, `continente` y `pais` definidos para el dashboard. La respuesta `200` SHALL informar el periodo solicitado, los filtros aplicados y una lista `terminos` de hasta 32 elementos.

Cada elemento SHALL incluir `id_termino`, `termino`, `idioma`, `peso`, `aporte_total` y `frecuencia`. El estado activo actual de un término MUST NOT excluir sus aportes históricos persistidos.

#### Scenario: Consultar términos influyentes
- **WHEN** existen aportes de términos asociados a noticias evaluables que coinciden con el rango y los filtros seleccionados
- **THEN** la respuesta agrupa esos aportes por término e idioma
- **AND** devuelve como máximo los primeros 32 términos

#### Scenario: Conservar contribuciones de términos inactivos
- **WHEN** un término actualmente inactivo conserva aportes asociados a noticias evaluables dentro del filtro
- **THEN** el término participa en la respuesta con sus aportes históricos

#### Scenario: Consultar un ámbito sin términos
- **WHEN** ninguna noticia evaluable con términos persistidos coincide con el rango y los filtros seleccionados
- **THEN** la respuesta contiene `terminos: []`

### Requirement: Cálculo y orden determinista de términos influyentes
Para cada término, el sistema MUST calcular `peso` como `SUM(ABS(NOTICIA_TERMINO.aporte_humor))`, `aporte_total` como `SUM(NOTICIA_TERMINO.aporte_humor)` y `frecuencia` como `SUM(NOTICIA_TERMINO.ocurrencias)`. MUST ordenar los términos por `peso` descendente, luego por `frecuencia` descendente y finalmente por `id_termino` ascendente, y SHALL aplicar el límite fijo de 32 después del ordenamiento.

#### Scenario: Acumular magnitudes sin cancelar aportes
- **WHEN** un término tiene aportes `-8.00` y `6.00` dentro del filtro
- **THEN** el término contiene `peso: 14.00` y `aporte_total: -2.00`

#### Scenario: Acumular ocurrencias
- **WHEN** un término tiene dos y tres ocurrencias en noticias coincidentes
- **THEN** el término contiene `frecuencia: 5`

#### Scenario: Desempatar términos
- **WHEN** dos términos tienen el mismo `peso`
- **THEN** aparece primero el de mayor `frecuencia`
- **AND** si también comparten la frecuencia, aparece primero el de menor `id_termino`

### Requirement: Validación y publicación del contrato
El sistema MUST responder `400` en ambas operaciones cuando falte cualquiera de las fechas, una fecha no tenga formato válido, `fecha_desde` sea posterior a `fecha_hasta`, `continente` esté fuera del dominio admitido, `pais` no tenga exactamente dos letras o se informe `pais` sin `continente`. Ambas operaciones, sus parámetros, respuestas y errores SHALL estar publicados en OpenAPI.

#### Scenario: Rechazar un rango incompleto o invertido
- **WHEN** falta uno de los extremos del rango o `fecha_desde` es posterior a `fecha_hasta`
- **THEN** el endpoint responde `400`

#### Scenario: Rechazar filtros geográficos inválidos
- **WHEN** se informa un continente no admitido, un país que no tiene dos letras o un país sin continente
- **THEN** el endpoint responde `400`

#### Scenario: Publicar el endpoint
- **WHEN** un consumidor consulta la documentación OpenAPI
- **THEN** encuentra `GET /api/v1/dashboards` y `GET /api/v1/dashboards/nube-palabras`, sus cuatro parámetros, sus esquemas de respuesta y los códigos `200`, `400` y `500`
