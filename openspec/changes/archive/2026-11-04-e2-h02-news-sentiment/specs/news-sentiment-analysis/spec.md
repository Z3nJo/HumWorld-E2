# Spec Delta

## Purpose

Calcular y conservar el humor de cada noticia capturada, junto con las apariciones de términos que explican el resultado, de acuerdo con ADR-001.

## ADDED Requirements

### Requirement: Reconocimiento de términos en noticias
El sistema SHALL analizar `titulo` seguido de `descripcion`, separados por un espacio cuando exista descripción, sin descargar el cuerpo del artículo. SHALL contar las apariciones completas de cada término activo cuyo idioma coincida con el de la noticia, sin distinguir mayúsculas ni tildes. La coincidencia inicial SHALL basarse en la palabra o secuencia de palabras registrada, sin exigir lematización ni formas flexionadas de E2-H03.

#### Scenario: Reconocer términos del idioma de la noticia
- **WHEN** el título y la descripción de una noticia `es` contienen dos apariciones completas de un término español activo, con diferencias de mayúsculas o tildes
- **THEN** el análisis reconoce ese término con dos ocurrencias

#### Scenario: Excluir términos no aplicables
- **WHEN** el texto contiene un término inactivo, uno registrado solo en otro idioma o una coincidencia que es parte de una palabra más larga
- **THEN** esas coincidencias no contribuyen al análisis

#### Scenario: Analizar una noticia sin descripción
- **WHEN** una noticia no tiene descripción
- **THEN** el análisis utiliza solamente su título

### Requirement: Cálculo parametrizado del humor
El sistema SHALL calcular el valor a partir de los pares `(valor, ocurrencias)` reconocidos y de parámetros ya resueltos. Con `humor.formula_noticia = promedio_ponderado`, SHALL usar `Σ(ocurrencias × valor) / (humor.escala_maxima × Σocurrencias)`. SHALL admitir también `promedio_simple`, que promedia los valores de los términos distintos reconocidos y los divide por la escala, y `suma_acotada`, que acota `Σ(ocurrencias × valor) / (humor.escala_maxima × humor.saturacion_suma)` a `[-1, 1]`. El motor MUST rechazar un valor de término fuera de `[-10, 10]` o con más de un decimal efectivo, conforme a la precisión de ADR-001, en vez de recortarlo o redondearlo silenciosamente. MUST devolver `NULL` si no hay términos reconocidos.

#### Scenario: Calcular el promedio ponderado por defecto
- **WHEN** se reconocen dos apariciones de un término de valor `-9`, una de `-6` y una de `+5`, con escala `10`
- **THEN** el valor calculado es `-0,475`

#### Scenario: Distinguir neutralidad de ausencia de evidencia
- **WHEN** los aportes positivos y negativos se cancelan con términos reconocidos
- **THEN** el valor calculado es `0`
- **AND** cuando no se reconoce ningún término, el valor es `NULL`

#### Scenario: Cambiar la fórmula configurada
- **WHEN** se procesa el mismo conjunto de términos con `promedio_simple` o `suma_acotada`
- **THEN** el resultado responde a la fórmula seleccionada y a sus parámetros, sin cambiar el código del motor

#### Scenario: Rechazar un término fuera de escala
- **WHEN** un término reconocido tiene un valor menor que `-10` o mayor que `10`
- **THEN** el cálculo falla de forma explícita y no persiste un valor de humor recortado

#### Scenario: Rechazar un término incompatible con la precisión aprobada
- **WHEN** un término reconocido tiene más de un decimal efectivo
- **THEN** el cálculo falla de forma explícita y no persiste un aporte redondeado que impida reconstruir el humor

### Requirement: Persistencia coherente y auditable
Para cada noticia procesada, el sistema SHALL guardar una `fecha_analisis` y el valor de humor resultante. SHALL guardar una fila por término reconocido en `NOTICIA_TERMINO`, con su número positivo de ocurrencias y su aporte no normalizado `ocurrencias × valor`. El valor y las filas SHALL confirmarse en una misma transacción. El humor SHALL persistirse con tres decimales y cada aporte con dos, usando redondeo a la mitad hacia arriba en valor absoluto. Las noticias sin términos SHALL quedar con `valor_humor = NULL`, `fecha_analisis` informada y sin filas de términos.

#### Scenario: Guardar una noticia con términos
- **WHEN** una noticia reconoce términos válidos y completa su análisis
- **THEN** conserva su valor de humor, fecha de análisis y una fila por término con ocurrencias y aporte
- **AND** para la fórmula ponderada por defecto, el valor persistido coincide con el promedio reconstruido de esos aportes y ocurrencias tras el redondeo

#### Scenario: Guardar una noticia sin términos
- **WHEN** una noticia no reconoce términos activos de su idioma
- **THEN** `fecha_analisis` queda informada, `valor_humor` queda nulo y no se crean filas en `NOTICIA_TERMINO`

#### Scenario: Evitar resultados parciales
- **WHEN** falla el cálculo o la escritura de cualquiera de los aportes
- **THEN** no se confirma un humor, fecha o desglose parcial de esa noticia

### Requirement: Selección y recuperación de noticias pendientes
El sistema MUST identificar noticias pendientes exclusivamente por `fecha_analisis IS NULL`. SHALL permitir procesar noticias ya almacenadas que sigan pendientes y MUST evitar recalcular noticias analizadas al repetir una captura o al editar términos o parámetros.

#### Scenario: Recuperar una noticia anterior
- **WHEN** una noticia almacenada antes de E2-H02 conserva `fecha_analisis = NULL`
- **THEN** el procesamiento de pendientes puede calcularla y persistirla

#### Scenario: No repetir una noticia sin términos
- **WHEN** una noticia tiene `fecha_analisis` informada y `valor_humor = NULL`
- **THEN** el procesamiento de pendientes no la selecciona de nuevo

#### Scenario: Conservar la instantánea histórica
- **WHEN** cambia el valor o el estado de un término, o cambia un parámetro de humor
- **THEN** los resultados de noticias ya analizadas permanecen sin recalcular
