## Why

SonarQube Cloud identifica dos incidencias bloqueantes `secrets:S6698`: URLs de PostgreSQL con una contraseña literal en CI y Docker Compose. Es necesario retirar las credenciales del código versionado y permitir su sustitución sin perder los datos del entorno integrado, como parte de SNQ-04.

## What Changes

- Eliminar contraseñas literales y respaldos inseguros de la configuración activa de PostgreSQL en Compose y CI; revisar también ejemplos e instrucciones operativas del recorrido afectado.
- **BREAKING**: el arranque Docker requerirá credenciales externas explícitas; fallará con un mensaje legible si faltan, en lugar de usar la contraseña publicada.
- Configurar desarrollo mediante un `.env` local ignorado y una plantilla versionada sin secretos utilizables.
- Obtener la contraseña de la base efímera de CI mediante un secreto de GitHub Actions, compartido por PostgreSQL y las conexiones de pruebas, sin imprimirlo en logs.
- Documentar y verificar la rotación de la contraseña en volúmenes existentes sin borrar la base; conservar las rutas HTTP y los flujos de captura, dashboard y purga.
- Conservar evidencia del análisis de Sonar que confirma la desaparición de las dos incidencias sobre el commit final.

## Capabilities

### New Capabilities

- `deployment-credentials`: provisión externa y coherente de credenciales PostgreSQL para Docker y CI, rechazo de configuración incompleta, protección de logs y rotación conservando datos.

### Modified Capabilities

Ninguna. Se mantienen los contratos funcionales y HTTP existentes.

## Impact

- Configuración: `opsx/docker-compose.yml`, `.github/workflows/ci.yml`, plantilla de entorno, escape de URL en Alembic y reglas de exclusión existentes.
- Operación: README raíz/backend, configuración del secreto de CI y procedimiento de migración para instalaciones ya inicializadas.
- Verificación: comprobaciones de configuración, conexión PostgreSQL, integración Docker y resultados de CI/SonarQube Cloud.
- No incorpora nuevas dependencias de aplicación, migraciones de esquema ni cambios de frontend. No reescribe el historial Git ni da por completada toda SNQ-04: las demás incidencias de seguridad se revisan por separado.
