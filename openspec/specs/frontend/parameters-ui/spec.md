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

La interfaz SHALL validar los campos editables como enteros positivos y SHALL distinguir entre cambios pendientes, formulario sin cambios, guardado en curso y errores de carga o persistencia.

#### Scenario: Valor inválido

- **WHEN** un campo editable está vacío, no es entero o es menor que 1
- **THEN** se muestra el error junto al campo
- **AND** Guardar permanece deshabilitado

#### Scenario: Descartar cambios

- **WHEN** existen cambios pendientes y el usuario pulsa Descartar
- **THEN** el formulario vuelve a los valores cargados originalmente
- **AND** el estado vuelve a indicar que no hay cambios sin guardar

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
