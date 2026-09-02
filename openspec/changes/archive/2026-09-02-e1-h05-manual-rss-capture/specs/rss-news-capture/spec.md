## Purpose

Permitir solicitar una captura inmediata de noticias RSS sin alterar la captura automática programada.

## ADDED Requirements

### Requirement: Captura manual de fuentes RSS
El sistema SHALL exponer `POST /api/v1/sources/capture` para ejecutar inmediatamente la captura RSS de todas las fuentes activas o de un subconjunto seleccionado mediante `source_ids`.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** se solicita `POST /api/v1/sources/capture` sin identificadores
- **THEN** el sistema procesa todas las fuentes activas
- **AND** responde con el resumen de la ejecución

#### Scenario: Capturar fuentes seleccionadas
- **WHEN** se solicita el endpoint con una lista válida de `source_ids`
- **THEN** el sistema procesa solo las fuentes activas seleccionadas
- **AND** conserva la deduplicación y actualización de fecha de captura existentes

#### Scenario: Ignorar fuentes inactivas
- **WHEN** una fuente indicada existe pero está inactiva
- **THEN** el sistema no descarga su feed
- **AND** la respuesta la identifica como omitida

#### Scenario: Rechazar fuente inexistente
- **WHEN** la lista contiene un identificador que no existe
- **THEN** el sistema responde `404`
- **AND** no inicia la captura parcial

#### Scenario: Aislar fallos durante la captura
- **WHEN** una fuente falla al descargar o interpretar su feed
- **THEN** el sistema registra el error en su reporte
- **AND** continúa procesando las demás fuentes

### Requirement: Resultado de captura manual
La respuesta de la captura manual SHALL incluir el resultado por fuente y los totales de noticias insertadas y fuentes fallidas, y SHALL estar documentada en OpenAPI.

#### Scenario: Confirmar ejecución completada
- **WHEN** finaliza el recorrido de las fuentes seleccionadas
- **THEN** el endpoint responde `200`
- **AND** incluye `inserted`, `duplicates`, `invalid` y `error` por fuente
- **AND** incluye los totales de la ejecución

