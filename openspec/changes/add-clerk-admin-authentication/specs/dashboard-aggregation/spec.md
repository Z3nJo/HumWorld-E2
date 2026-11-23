## MODIFIED Requirements

### Requirement: Validación y publicación del contrato
El sistema MUST responder `400` cuando una operación con rango obligatorio omita cualquiera de las fechas, una fecha no tenga formato válido, `fecha_desde` sea posterior a `fecha_hasta`, `continente` esté fuera del dominio admitido, `pais` no tenga exactamente dos letras o se informe `pais` sin `continente`. `GET /api/v1/dashboards`, `/nube-palabras` y `/noticias-influyentes` SHALL aceptar consultas anónimas; `/geografia`, `/evolucion` y `/noticias/{id}/terminos` MUST requerir autorización administrativa. Las seis operaciones del dashboard, sus parámetros, respuestas y errores SHALL estar publicados en OpenAPI. Las operaciones protegidas MUST declarar el esquema Bearer y los códigos `401` y `403`, mientras las tres operaciones públicas MUST NOT exigir ese esquema.

#### Scenario: Rechazar un rango incompleto o invertido
- **WHEN** falta uno de los extremos del rango o `fecha_desde` es posterior a `fecha_hasta`
- **THEN** el endpoint responde `400`

#### Scenario: Rechazar filtros geográficos inválidos
- **WHEN** se informa un continente no admitido, un país que no tiene dos letras o un país sin continente
- **THEN** el endpoint responde `400`

#### Scenario: Consultar el dashboard público
- **WHEN** un cliente anónimo solicita `/api/v1/dashboards`, `/nube-palabras` o `/noticias-influyentes` con parámetros válidos
- **THEN** el endpoint procesa la consulta sin exigir credenciales

#### Scenario: Consultar una operación protegida del dashboard
- **WHEN** un cliente anónimo solicita `/api/v1/dashboards/geografia`, `/evolucion` o `/noticias/{id}/terminos`
- **THEN** el endpoint responde `401`

#### Scenario: Publicar el endpoint
- **WHEN** un consumidor consulta la documentación OpenAPI
- **THEN** encuentra `GET /api/v1/dashboards`, `/geografia`, `/evolucion`, `/nube-palabras`, `/noticias-influyentes` y `/noticias/{id}/terminos`, sus parámetros, esquemas de respuesta y los códigos de error aplicables
- **AND** distingue cuáles operaciones son públicas y cuáles requieren autenticación Bearer
