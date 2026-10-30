# dashboard-aggregation Specification

## Purpose

Proporcionar a los consumidores del dashboard consultas verificables del humor agregado y de los términos más influyentes por periodo y ámbito geográfico.

## Requirements

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

### Requirement: Consulta geográfica para el mapa
El sistema SHALL exponer `GET /api/v1/dashboards/geografia` con `fecha_desde` y `fecha_hasta` obligatorias. La respuesta SHALL conservar la forma del dashboard agregado y contener, para el mismo periodo, los seis agregados continentales junto con los agregados de cada país informado en los canales.

#### Scenario: Consultar continentes y países
- **WHEN** se solicita un rango válido con noticias evaluables de canales con y sin país
- **THEN** la respuesta contiene un agregado por cada continente admitido
- **AND** contiene agregados por los países informados
- **AND** conserva las noticias sin país solamente en su continente

#### Scenario: Representar países sin alterar el periodo
- **WHEN** un país tiene noticias evaluables dentro y fuera del rango solicitado
- **THEN** su agregado incluye exclusivamente las noticias del rango UTC aplicado a los agregados continentales

### Requirement: Evolución diaria del humor
El sistema SHALL exponer `GET /api/v1/dashboards/evolucion` con los filtros opcionales `continente` y `pais`. Cuando no se informen fechas SHALL usar los 30 días terminados en la fecha UTC actual; cuando se informen SHALL aplicar días completos inclusivos UTC y MUST rechazar periodos superiores a 366 días. La respuesta SHALL incluir todos los días del periodo en orden, completando los días sin noticias con `humor: null`, `noticias: 0` y `suficiente: false`.

#### Scenario: Consultar los últimos treinta días
- **WHEN** se invoca la evolución sin fechas
- **THEN** la respuesta contiene exactamente 30 días y finaliza en la fecha UTC actual

#### Scenario: Completar días sin noticias
- **WHEN** un periodo válido contiene días con noticias evaluables y días sin ellas
- **THEN** la respuesta contiene una entrada por cada fecha del periodo
- **AND** los días sin noticias se representan sin humor y con volumen cero

#### Scenario: Rechazar un periodo demasiado extenso
- **WHEN** el periodo de evolución supera 366 días inclusivos
- **THEN** el endpoint responde `400`

### Requirement: Ranking de noticias influyentes
El sistema SHALL exponer `GET /api/v1/dashboards/noticias-influyentes` con rango obligatorio y filtros geográficos opcionales. SHALL considerar solamente noticias evaluables, deduplicar las candidatas por URL exacta conservando la de menor `fecha_registro` y luego menor `id_noticia`, ordenar las representantes por `ABS(valor_humor)` descendente, `fecha_registro` descendente e `id_noticia` ascendente, y devolver como máximo 10. La pertenencia de las candidatas al ranking y la aplicación de los filtros `continente` y `pais` SHALL resolverse mediante las atribuciones geográficas persistidas de cada noticia, no mediante la geografía de su canal.

Cada elemento SHALL incluir `id_noticia`, `titulo`, `url`, `canal`, `continente`, `pais`, `fecha_registro`, `valor_humor` con signo y `paises_atribuidos`. Los campos singulares `canal`, `continente` y `pais` SHALL continuar describiendo la fuente editorial y no la atribución por mención. `paises_atribuidos` SHALL listar los códigos ISO-3166 alfa-2 de todas las atribuciones persistidas de la noticia, ordenados ascendentemente, y SHALL ser una lista vacía cuando la noticia solo pertenece a un continente por respaldo de la fuente. Las rutas y parámetros del endpoint SHALL conservarse sin cambios; el campo nuevo es aditivo.

#### Scenario: Exponer los países atribuidos de una noticia
- **WHEN** una noticia del ranking tiene atribuciones a uno o más países
- **THEN** su elemento incluye esos códigos en `paises_atribuidos`
- **AND** `pais` sigue describiendo el país del canal

#### Scenario: Ordenar por intensidad y desempatar
- **WHEN** varias noticias representantes cumplen el rango y los filtros
- **THEN** se ordenan por valor absoluto del humor descendente
- **AND** a igual intensidad se ordenan por fecha descendente y luego identificador ascendente

#### Scenario: Deduplicar una URL
- **WHEN** varias candidatas comparten exactamente la misma URL
- **THEN** participa solamente la de fecha de registro más antigua
- **AND** a igual fecha participa la de menor identificador

#### Scenario: Limitar el ranking
- **WHEN** existen más de 10 noticias representantes
- **THEN** la respuesta contiene solamente las primeras 10

#### Scenario: Consultar un ámbito sin candidatas
- **WHEN** ninguna noticia evaluable coincide con el rango y los filtros
- **THEN** el endpoint responde `200` con `noticias: []`

#### Scenario: Filtrar por un país atribuido distinto del país del canal
- **WHEN** se filtra el ranking por un país mencionado distinto del país del canal
- **THEN** la noticia participa en el resultado por su atribución geográfica
- **AND** sus campos `continente` y `pais` conservan la geografía del canal

#### Scenario: Mantener la compatibilidad de las respuestas existentes
- **WHEN** un consumidor vigente consulta cualquiera de los endpoints del dashboard después del cambio de atribución
- **THEN** los campos existentes conservan sus nombres, tipos y semántica publicada
- **AND** `paises_atribuidos` es el único campo aditivo del ranking de noticias influyentes
- **AND** no se agregan ni modifican rutas o parámetros destinados al frontend

### Requirement: Validación y publicación del contrato
El sistema MUST responder `400` cuando una operación con rango obligatorio omita cualquiera de las fechas, una fecha no tenga formato válido, `fecha_desde` sea posterior a `fecha_hasta`, `continente` esté fuera del dominio admitido, `pais` no tenga exactamente dos letras o se informe `pais` sin `continente`. Las cinco operaciones del dashboard, sus parámetros, respuestas y errores SHALL estar publicados en OpenAPI.

#### Scenario: Rechazar un rango incompleto o invertido
- **WHEN** falta uno de los extremos del rango o `fecha_desde` es posterior a `fecha_hasta`
- **THEN** el endpoint responde `400`

#### Scenario: Rechazar filtros geográficos inválidos
- **WHEN** se informa un continente no admitido, un país que no tiene dos letras o un país sin continente
- **THEN** el endpoint responde `400`

#### Scenario: Publicar el endpoint
- **WHEN** un consumidor consulta la documentación OpenAPI
- **THEN** encuentra `GET /api/v1/dashboards`, `/geografia`, `/evolucion`, `/nube-palabras` y `/noticias-influyentes`, sus parámetros, esquemas de respuesta y los códigos `200`, `400` y `500`
