# frontend/parameters-ui Specification

## Purpose

Proporcionar una pantalla de parámetros generales coherente con el prototipo visual de HumWorld, capaz de editar la configuración runtime disponible y comunicar de forma clara las capacidades que aún no están expuestas por la API.

## Requirements

### Requirement: Renderizar la pantalla de parámetros fiel al prototipo

La interfaz SHALL mostrar la página `/parametros` con la misma jerarquía visual, títulos, tarjetas, controles, espaciado, colores, tipografía y estados principales definidos por `HumWorld Prototipo.html`.

#### Scenario: Vista cargada

- **WHEN** la configuración se carga correctamente
- **THEN** se muestran las tarjetas de captura y caducidad con sus valores actuales
- **AND** se muestra la tarjeta de agregación de humor según el estado de disponibilidad de la API
- **AND** los textos visibles se presentan correctamente codificados en español

### Requirement: Consultar y actualizar configuración disponible

La interfaz SHALL consultar `GET /api/v1/config` al entrar en la página y SHALL enviar `PUT /api/v1/config` únicamente con los campos soportados por ese contrato.

#### Scenario: Guardar valores válidos

- **WHEN** el usuario modifica periodicidad o caducidad con enteros mayores o iguales a 1 y pulsa Guardar
- **THEN** se envía la configuración al endpoint existente
- **AND** la interfaz confirma el guardado
- **AND** los valores mostrados reflejan la respuesta de la API

### Requirement: Validar y gestionar cambios del formulario

La interfaz SHALL validar los campos editables como enteros positivos, SHALL rechazar entradas no enteras o decimales sin truncarlas y SHALL distinguir explícitamente entre errores de carga y errores de guardado.

#### Scenario: Valor inválido

- **WHEN** un campo editable está vacío, no es entero, contiene decimales o es menor que 1
- **THEN** se muestra el error junto al campo
- **AND** Guardar permanece deshabilitado

#### Scenario: Descartar cambios

- **WHEN** existen cambios pendientes y el usuario pulsa Descartar
- **THEN** el formulario vuelve a los valores cargados originalmente
- **AND** el estado vuelve a indicar que no hay cambios sin guardar

#### Scenario: Fallo de guardado

- **WHEN** falla la petición PUT de guardado de parámetros
- **THEN** el formulario y los cambios pendientes se conservan visibles
- **AND** se muestra el mensaje de error de guardado
- **AND** el usuario puede volver a pulsar Guardar para reintentar la operación

### Requirement: Comunicar parámetros no soportados por el backend

La interfaz SHALL indicar que `humor.minimo_noticias_agregacion` no puede editarse ni persistirse cuando no esté presente en la respuesta o contrato de configuración del backend, sin simular un guardado local.

#### Scenario: API sin parámetro de agregación

- **WHEN** `GET /api/v1/config` no incluye `humor.minimo_noticias_agregacion`
- **THEN** la tarjeta correspondiente conserva la apariencia del prototipo
- **AND** sus controles se muestran como no disponibles o no editables
- **AND** se informa que requiere soporte backend
- **AND** Guardar no incluye ese campo en la petición

### Requirement: Mantener integración relativa con la API

La interfaz SHALL usar las rutas relativas del frontend para que las solicitudes `/api/v1/config` continúen pasando por el proxy configurado del proyecto.

#### Scenario: Carga mediante el entorno del proyecto

- **WHEN** la aplicación se sirve desde el frontend del proyecto
- **THEN** la pantalla obtiene y guarda configuración mediante el backend conectado por el proxy
- **AND** no requiere una URL absoluta ni cambios en el backend

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
