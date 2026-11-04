## ADDED Requirements

### Requirement: Purgado manual de noticias caducadas desde la interfaz

La interfaz SHALL ofrecer en la tarjeta «Captura y caducidad» de `/parametros` una acción «Purgar ahora» que, tras una confirmación explícita, ejecute `DELETE /api/v1/news` usando la caducidad persistida en el backend.

#### Scenario: Confirmar el purgado
- **WHEN** el usuario pulsa «Purgar ahora» sin cambios de parámetros pendientes
- **THEN** se muestra un modal que indica que se eliminarán de forma permanente las noticias con más de `{n}` días de antigüedad, donde `{n}` es la caducidad cargada desde `GET /api/v1/config`
- **AND** no se envía ninguna petición hasta que el usuario confirme

#### Scenario: Cancelar el purgado
- **WHEN** el usuario cancela o cierra el modal de confirmación
- **THEN** no se envía `DELETE /api/v1/news`
- **AND** la pantalla de parámetros conserva su estado

#### Scenario: Purgado completado
- **WHEN** el usuario confirma y `DELETE /api/v1/news` responde `204`
- **THEN** se cierra el modal y se muestra un toast confirmando que se purgaron las noticias caducadas
- **AND** el mensaje no indica una cantidad de noticias eliminadas, porque la API no la devuelve

#### Scenario: Purgado con cambios sin guardar
- **WHEN** existen cambios pendientes en el formulario de parámetros
- **THEN** «Purgar ahora» permanece deshabilitado
- **AND** se indica que deben guardarse o descartarse los cambios antes de purgar

#### Scenario: Evitar purgados duplicados
- **WHEN** hay un purgado en curso
- **THEN** la confirmación del modal permanece deshabilitada e indica que la operación está en curso
- **AND** no se envía una segunda petición `DELETE /api/v1/news`

#### Scenario: Fallo del purgado
- **WHEN** `DELETE /api/v1/news` responde con error o la red falla
- **THEN** se muestra un toast de error con el mensaje legible de la API
- **AND** el formulario de parámetros conserva sus valores
- **AND** el usuario puede volver a pulsar «Purgar ahora» para reintentar
