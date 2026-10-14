# Spec Delta

## MODIFIED Requirements

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
