## Purpose

Establecer la provisión externa de credenciales PostgreSQL en desarrollo Docker y CI, evitando su publicación y permitiendo rotarlas sin perder los datos persistidos de HumWorld.

## ADDED Requirements

### Requirement: Credenciales externas obligatorias para Docker

El entorno Docker SHALL obtener la contraseña de PostgreSQL y las credenciales de conexión del backend desde configuración externa privada. Los archivos versionados de configuración activa y las plantillas operativas MUST NOT contener contraseñas utilizables ni valores de respaldo con contraseñas literales. La documentación SHALL identificar cómo proporcionar valores coherentes y cómo codificar caracteres reservados de una contraseña en la URL de conexión.

#### Scenario: Arrancar con credenciales privadas coherentes
- **WHEN** se proporcionan una contraseña privada y una URL de conexión que autentica con esa contraseña en una base limpia
- **THEN** PostgreSQL y el backend arrancan y las migraciones y consultas de la aplicación pueden ejecutarse
- **AND** el frontend mantiene acceso a la API mediante la configuración Docker existente

#### Scenario: Rechazar credenciales ausentes
- **WHEN** falta o está vacía la contraseña requerida o la URL de conexión del backend
- **THEN** la validación de Compose falla antes de iniciar los servicios e identifica la clave requerida
- **AND** no sustituye la ausencia por una contraseña publicada

#### Scenario: Mantener privados los archivos locales
- **WHEN** un operador crea el archivo de entorno siguiendo la plantilla y las instrucciones del repositorio
- **THEN** Git ignora el archivo privado y permite versionar la plantilla sin credenciales utilizables

### Requirement: Autenticación de PostgreSQL en CI sin secretos versionados

El pipeline SHALL obtener la contraseña de su base de pruebas desde un secreto externo de GitHub Actions y SHALL usar credenciales coherentes en el servidor PostgreSQL y en sus clientes. MUST conservar la autenticación, la aplicación de migraciones y las pruebas de integración obligatorias. La validación y ejecución habitual de CI MUST NOT imprimir la contraseña, su representación codificada ni URLs con credenciales completas.

#### Scenario: Ejecutar pruebas con un secreto válido
- **WHEN** el secreto de CI está disponible y es válido, incluso si contiene caracteres reservados para una URL
- **THEN** las migraciones y pruebas se conectan a la base de pruebas usando la contraseña suministrada
- **AND** las comprobaciones de Compose usan una conexión coherente con su red interna
- **AND** los logs no exponen las credenciales suministradas

#### Scenario: Fallar sin secreto disponible
- **WHEN** el workflow no recibe el secreto requerido, incluido un evento que no permita acceso a secretos
- **THEN** CI falla con un diagnóstico de provisión de credenciales
- **AND** no desactiva la autenticación, no usa una contraseña literal ni omite silenciosamente las pruebas obligatorias

### Requirement: Rotación conservando la base existente

El proyecto SHALL proporcionar un procedimiento verificable para cambiar la contraseña del rol PostgreSQL y actualizar la conexión de la aplicación en instalaciones con volumen existente. El procedimiento MUST conservar los datos, evitar exponer la contraseña en comandos registrados y comprobar la autenticación mediante una conexión nueva. MUST NOT depender de eliminar el volumen ni asumir que cambiar una variable de inicialización modifica un rol existente.

#### Scenario: Rotar sin perder datos
- **WHEN** se ejecuta el procedimiento sobre una base existente con registros de referencia y un respaldo disponible
- **THEN** una conexión TCP nueva con la contraseña nueva autentica y la anterior deja de autenticar
- **AND** el backend puede reconectarse y los registros de referencia permanecen disponibles

### Requirement: Evidencia de resolución de las incidencias bloqueantes

El cierre de este cambio SHALL incluir evidencia sanitizada de la validación Docker y CI y de un análisis finalizado de SonarQube Cloud sobre el commit integrado en `main`. La evidencia SHALL comprobar que las dos incidencias `secrets:S6698` identificadas en CI y Compose ya no están abiertas por esos literales. MUST NOT sustituirse la corrección por exclusiones globales del análisis, una reducción de severidad o una aceptación sin justificación.

#### Scenario: Verificar el resultado sobre código corregido
- **WHEN** finaliza el análisis de SonarQube Cloud del commit integrado que contiene la corrección
- **THEN** la evidencia identifica rama, SHA, fecha y resultado de las dos incidencias originales
- **AND** no declara resueltas las demás incidencias de SNQ-04 sin revisarlas
