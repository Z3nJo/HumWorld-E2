## MODIFIED Requirements

### Requirement: Recorrido de fuentes activas
Cada ejecucion automatica SHALL consultar y procesar solamente las fuentes RSS con `activa=true` cuyo canal asociado tenga `activo=true` al comenzar el recorrido. La ejecucion MUST excluir tanto las fuentes inactivas como las fuentes pertenecientes a canales inactivos.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** comienza una ejecucion con varias fuentes activas asociadas a canales activos
- **THEN** el sistema intenta procesar cada una de esas fuentes

#### Scenario: Excluir una fuente inactiva
- **WHEN** una fuente esta registrada con `activa=false` aunque su canal este activo
- **THEN** el sistema no descarga ni procesa su feed durante la ejecucion

#### Scenario: Excluir un canal inactivo
- **WHEN** una fuente tiene `activa=true` pero su canal asociado tiene `activo=false`
- **THEN** el sistema no descarga ni procesa su feed durante la ejecucion

#### Scenario: Reactivar un canal sin alterar las fuentes
- **WHEN** un canal vuelve a `activo=true`
- **THEN** las siguientes ejecuciones vuelven a considerar solamente sus fuentes que conservan `activa=true`

### Requirement: Captura manual de fuentes RSS
El sistema SHALL exponer `POST /api/v1/sources/capture` para ejecutar inmediatamente la captura RSS de todas las fuentes elegibles o de un subconjunto seleccionado mediante `source_ids`. Una fuente SHALL ser elegible solamente cuando tanto ella como su canal asociado esten activos.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** se solicita `POST /api/v1/sources/capture` sin identificadores
- **THEN** el sistema procesa todas las fuentes activas asociadas a canales activos
- **AND** responde con el resumen de la ejecucion

#### Scenario: Capturar fuentes seleccionadas
- **WHEN** se solicita el endpoint con una lista de `source_ids` existentes, activos y asociados a canales activos
- **THEN** el sistema procesa solamente esas fuentes
- **AND** conserva la deduplicacion y actualizacion de fecha de captura existentes

#### Scenario: Ignorar fuentes inactivas
- **WHEN** una fuente indicada existe pero tiene `activa=false`
- **THEN** el sistema no descarga su feed
- **AND** la respuesta incluye su identificador en `skipped_source_ids`

#### Scenario: Omitir una fuente seleccionada de canal inactivo
- **WHEN** una fuente indicada tiene `activa=true` pero su canal asociado tiene `activo=false`
- **THEN** el sistema no descarga su feed
- **AND** la respuesta incluye su identificador en `skipped_source_ids`

#### Scenario: Rechazar fuente inexistente
- **WHEN** la lista contiene un identificador que no existe
- **THEN** el sistema responde `404`
- **AND** no inicia la captura parcial

#### Scenario: Aislar fallos durante la captura
- **WHEN** una fuente elegible falla al descargar o interpretar su feed
- **THEN** el sistema registra el error en su reporte
- **AND** continua procesando las demas fuentes elegibles
