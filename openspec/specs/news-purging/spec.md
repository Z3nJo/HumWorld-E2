# news-purging Specification

## Purpose

Eliminar automática o manualmente noticias caducadas para respetar la retención configurada sin conservar datos históricos fuera de su ventana temporal.

## Requirements

### Requirement: Purgado automático según caducidad configurada
El sistema SHALL ejecutar periódicamente un purgado automático de noticias. En cada ejecución SHALL resolver el valor vigente de `noticias.caducidad_dias` y SHALL eliminar físicamente las noticias cuya `fecha_registro` sea estrictamente anterior a `ahora - noticias.caducidad_dias`. La operación SHALL usar `fecha_registro` como única referencia temporal y SHALL conservar noticias cuyo registro coincida exactamente con el umbral.

#### Scenario: Eliminar noticias caducadas
- **WHEN** el purgado se ejecuta con una caducidad configurada de 30 días y existe una noticia con `fecha_registro` anterior a 30 días respecto del instante de ejecución
- **THEN** la noticia se elimina físicamente

#### Scenario: Conservar noticias vigentes y en el límite
- **WHEN** el purgado se ejecuta y existen noticias posteriores al umbral o con `fecha_registro` exactamente igual al umbral
- **THEN** esas noticias permanecen almacenadas

#### Scenario: Aplicar una caducidad actualizada
- **WHEN** `noticias.caducidad_dias` cambia antes de la siguiente ejecución periódica
- **THEN** el purgado usa el valor actualizado para calcular su umbral

### Requirement: Ejecución coordinada con la periodicidad runtime
El sistema SHALL programar el purgado automático con la periodicidad vigente de `captura.periodicidad_minutos`. Cuando dicha periodicidad se actualice mientras el scheduler esté activo, SHALL reprogramar tanto la captura como el purgado sin reiniciar el backend ni ejecutar un purgado inmediato.

#### Scenario: Programar ambos procesos al iniciar
- **WHEN** el backend inicia con el scheduler habilitado y una periodicidad de captura configurada
- **THEN** la captura y el purgado quedan programados con ese mismo intervalo
- **AND** ninguno se ejecuta como efecto del inicio del scheduler

#### Scenario: Reprogramar ambos procesos en caliente
- **WHEN** se actualiza correctamente `captura.periodicidad_minutos` mientras el scheduler está activo
- **THEN** los jobs de captura y purgado adoptan el nuevo intervalo
- **AND** sus próximas ejecuciones se programan después del nuevo intervalo

### Requirement: Eliminación íntegra y acotada de datos de noticias
El sistema SHALL eliminar junto con cada noticia caducada sus filas asociadas en `NOTICIA_TERMINO`, conforme a las restricciones de integridad existentes. El purgado MUST NOT eliminar fuentes RSS, canales, términos del diccionario ni parámetros de configuración.

#### Scenario: Eliminar aportes de la noticia purgada
- **WHEN** se purga una noticia caducada que tiene filas asociadas en `NOTICIA_TERMINO`
- **THEN** las filas asociadas se eliminan junto con la noticia

#### Scenario: Conservar entidades ajenas al purgado
- **WHEN** el purgado elimina una o más noticias caducadas
- **THEN** las fuentes RSS, canales, términos y configuración asociados permanecen disponibles

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
