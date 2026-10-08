# Spec Delta

## Purpose

Layout base de la aplicación HumWorld: sidebar de navegación con secciones Análisis y Administración, área de contenido principal, y footer con referencias a la API. Sirve como contenedor visual persistente para todas las pantallas del frontend.

## ADDED Requirements

### Requirement: Sidebar de navegación
La aplicación SHALL renderizar un sidebar lateral fijo con el nombre de la aplicación, el subtítulo descriptivo y dos secciones de navegación: "Análisis" con el enlace al Dashboard y "Administración" con los enlaces a Fuentes y canales, Diccionario, Parámetros y Captura y borrado. El ítem activo MUST distinguirse visualmente del resto.

#### Scenario: Navegar al diccionario desde el sidebar
- **WHEN** el usuario pulsa el ítem "Diccionario" en el sidebar
- **THEN** la aplicación navega a `/dictionary` y ese ítem queda marcado como activo

#### Scenario: Identificar el ítem activo
- **WHEN** la URL actual coincide con la ruta de un ítem del sidebar
- **THEN** ese ítem se muestra con estilo activo diferenciado visualmente del resto

### Requirement: Footer de referencia API
El sidebar o la base de la aplicación SHALL mostrar un footer con acceso directo a la URL de la API (`/api/v1`), al contrato Swagger (`/api/docs`) y un enlace de prototipo a datos de ejemplo. Estos enlaces MUST abrirse en la misma pestaña.

#### Scenario: Acceder al contrato Swagger
- **WHEN** el usuario pulsa el enlace "Contrato /api/docs" en el footer
- **THEN** el navegador navega a `/api/docs`

### Requirement: Área de contenido principal
La aplicación SHALL renderizar un área de contenido a la derecha del sidebar donde se monte cada pantalla según la ruta activa. La ruta raíz `/` MUST redirigir automáticamente a `/dictionary`.

#### Scenario: Acceder a la raíz de la aplicación
- **WHEN** el usuario navega a `/`
- **THEN** la aplicación redirige automáticamente a `/dictionary`
