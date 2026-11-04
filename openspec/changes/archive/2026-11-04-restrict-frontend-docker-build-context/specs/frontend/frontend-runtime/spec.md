## ADDED Requirements

### Requirement: Empaquetado Docker limitado del frontend

La construcción Docker del frontend SHALL incorporar únicamente los manifiestos de dependencias, configuraciones de herramientas, código fuente y recursos públicos necesarios para ejecutar, construir y verificar la aplicación. SHALL excluir del contexto enviado al constructor y de las capas generadas los archivos `.env` y `.env.*`, configuraciones `.npmrc`, claves `*.pem` y `*.key`, metadatos Git, dependencias locales, compilaciones previas, cobertura, informes de pruebas y logs locales, tanto en raíz como en subdirectorios. Las dependencias instaladas y los artefactos producidos durante la construcción o verificación SHALL seguir disponibles para su finalidad.

#### Scenario: Construir con archivos privados locales presentes
- **WHEN** el contexto del frontend contiene archivos `.env`, `.env.local`, `.npmrc`, `*.pem` o `*.key` en raíz o dentro de los directorios de fuentes y recursos
- **THEN** esos archivos no se transmiten al constructor ni aparecen en las capas de la imagen generada

#### Scenario: Excluir artefactos generados en el equipo
- **WHEN** el contexto contiene directorios locales `node_modules`, `dist`, `.git`, `coverage`, `test-results`, `playwright-report` o archivos de log, en raíz o subdirectorios
- **THEN** esos elementos locales no se transmiten al constructor ni se incorporan a las capas de la imagen
- **AND** la instalación de dependencias dentro de la imagen continúa disponible

#### Scenario: Incorporar los recursos necesarios
- **WHEN** se construye la imagen desde un checkout con sus archivos versionados y sin dependencias instaladas localmente
- **THEN** la imagen contiene los recursos necesarios para iniciar el frontend y ejecutar su build, lint y pruebas
- **AND** los recursos públicos de la aplicación se sirven correctamente

#### Scenario: Conservar la aplicación integrada
- **WHEN** se inicia la imagen resultante con la configuración de entorno del servicio frontend de Compose
- **THEN** la aplicación y sus rutas del navegador son accesibles desde el host en el puerto 5173
- **AND** las solicitudes relativas `/api` alcanzan el backend configurado sin depender de copiar un archivo `.env` a la imagen

#### Scenario: No incorporar archivos ajenos a la selección del frontend
- **WHEN** aparece un nuevo archivo en la raíz del contexto fuera de los recursos seleccionados para el frontend
- **THEN** ese archivo no se incorpora automáticamente a las capas de la imagen
