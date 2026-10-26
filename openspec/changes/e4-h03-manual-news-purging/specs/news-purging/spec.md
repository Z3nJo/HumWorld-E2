## ADDED Requirements

### Requirement: Purgado manual de noticias caducadas mediante API
El sistema SHALL exponer `DELETE /api/v1/news`, sin cuerpo ni parámetros de consulta, para ejecutar bajo demanda el purgado de noticias. En cada solicitud SHALL resolver el valor vigente de `noticias.caducidad_dias`, SHALL aplicar la misma regla temporal e integridad del purgado automático y SHALL responder `204 No Content` sin cuerpo. La operación MUST ser idempotente, SHALL permanecer disponible sin autenticación y SHALL publicarse en OpenAPI con sus respuestas `204` y `500`.

#### Scenario: Eliminar manualmente las noticias caducadas
- **WHEN** se solicita `DELETE /api/v1/news` y existen noticias con `fecha_registro` estrictamente anterior al umbral calculado en UTC con la caducidad vigente
- **THEN** esas noticias y sus filas asociadas en `NOTICIA_TERMINO` se eliminan físicamente en una transacción
- **AND** la API responde `204 No Content` sin cuerpo

#### Scenario: Conservar noticias vigentes y en el límite
- **WHEN** se solicita el purgado manual y existen noticias posteriores al umbral o exactamente iguales a este
- **THEN** esas noticias permanecen almacenadas
- **AND** la API responde `204 No Content` sin cuerpo

#### Scenario: Ejecutar el purgado sin noticias caducadas
- **WHEN** se solicita `DELETE /api/v1/news` y no existe ninguna noticia anterior al umbral vigente
- **THEN** la operación no altera los datos almacenados
- **AND** la API responde `204 No Content` sin cuerpo

#### Scenario: Aplicar una caducidad actualizada al purgado manual
- **WHEN** `noticias.caducidad_dias` cambia antes de solicitar `DELETE /api/v1/news`
- **THEN** la solicitud usa el valor actualizado para calcular el umbral

#### Scenario: Revertir un purgado manual fallido
- **WHEN** ocurre un error al ejecutar o confirmar el borrado solicitado mediante `DELETE /api/v1/news`
- **THEN** la transacción se revierte sin dejar una eliminación parcial
- **AND** la API responde `500` con el formato de error estándar
