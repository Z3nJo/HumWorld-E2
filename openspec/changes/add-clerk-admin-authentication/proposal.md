## Why

HumWorld necesita permitir que cualquier persona consulte el humor del mundo desde el landing y el dashboard, pero actualmente comparte esa superficie con funciones capaces de modificar la configuración del sistema. Se requiere separar la experiencia pública de consulta de los módulos administrativos, restringiendo estos últimos a las identidades registradas en la instancia Clerk dedicada de cada ambiente, sin hacer depender el dashboard público de Clerk ni mantener una lista manual paralela.

## What Changes

- Integrar Clerk como proveedor de identidad mediante correo electrónico y contraseña, sin proveedores sociales, registro público, MFA ni TOTP.
- Autorizar como administradores a todos los usuarios con una sesión válida emitida por la instancia Clerk dedicada del ambiente, manteniendo el registro público deshabilitado y las identidades independientes entre Development y Production.
- Incorporar una pantalla pública de inicio de sesión con correo y contraseña simultáneos, recuperación de contraseña por correo, y un desafío condicional de código por correo cuando Clerk solicite confiar en un dispositivo nuevo; después de autenticar desde el acceso administrativo, volver por defecto a `/dashboard`, y conservar cualquier ruta administrativa solicitada directamente.
- Mantener públicas las rutas `/` y `/dashboard`; proteger `/fuentes`, `/dictionary` y `/parametros` como módulos administrativos.
- Mostrar en el dashboard anónimo únicamente la navegación de análisis y una acción de acceso administrativo; cuando exista una sesión activa, conservar el mismo dashboard y revelar los módulos administrativos, la cuenta activa y el cierre de sesión sin cambiar de URL ni rediseñar la experiencia existente.
- Permitir acceso anónimo a las seis consultas analíticas de `GET /api/v1/dashboards`: resumen, geografía, evolución, nube de palabras, noticias influyentes y desglose de términos por noticia.
- Exigir un token Clerk válido, emitido por la instancia y el origen configurados, para las operaciones administrativas restantes de `/api/v1`; responder `401` ante credenciales ausentes, inválidas, expiradas o emitidas por otra instancia.
- Mantener el dashboard y sus consultas disponibles aunque Clerk no esté configurado, todavía esté cargando o no permita establecer una sesión; la autenticación ampliará la navegación, pero no será requisito para consultar el humor del mundo.
- Al cerrar sesión, permanecer en `/dashboard` y volver inmediatamente a su presentación pública.
- Mantener Swagger y el esquema OpenAPI públicos, documentando autenticación Bearer y las respuestas de autorización en las operaciones protegidas.
- Configurar Clerk mediante variables de entorno separadas para frontend y backend, sin persistir claves ni secretos en el repositorio.

## Capabilities

### New Capabilities

- `admin-authentication`: Autenticación Clerk de los usuarios registrados en la instancia dedicada de cada ambiente, recuperación y cierre de sesión, presentación pública o administrativa del dashboard, protección de módulos de gestión, matriz de recursos públicos y rechazo de credenciales inválidas o externas.

### Modified Capabilities

- `frontend/app-shell`: Conserva la identidad visual del shell y adapta su navegación según exista o no una sesión, sin bloquear el dashboard público.
- `dashboard-aggregation`: Declara públicas todas las consultas analíticas del dashboard y publica esa ausencia de autenticación obligatoria en OpenAPI.

## Impact

- Frontend React/Vite: proveedor Clerk no bloqueante para `/dashboard`, rutas públicas y protegidas, pantalla de inicio de sesión, navegación del shell adaptada a la sesión, cliente HTTP con token Bearer y controles de sesión administrativos.
- Backend FastAPI: validación de JWT de Clerk, aceptación de cualquier sujeto válido de la instancia configurada, dependencias de autorización y clasificación explícita de consultas analíticas públicas frente a routers administrativos protegidos.
- Contrato API: las seis consultas del dashboard permanecen sin esquema de seguridad; las operaciones administrativas declaran Bearer y respuestas `401`/`503`, sin cambiar rutas ni formas de respuesta.
- Configuración y despliegue: variables `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` y `CLERK_AUTHORIZED_PARTIES`, con valores distintos para desarrollo y producción y sin una lista de usuarios en `.env`.
- Validación operativa del cambio: probar en localhost dos cuentas registradas en Development sin configurarlas individualmente y preparar las variables de instancia para el encargado de Production. La configuración y las pruebas del ambiente productivo quedan a cargo de ese encargado.
- Dependencias y pruebas: SDKs oficiales de Clerk y cobertura automatizada del dashboard anónimo, presentación administrativa tras autenticar, continuidad pública ante fallas de Clerk, múltiples usuarios válidos de la instancia, token inválido, expirado o externo, retorno a la ruta solicitada y cierre de sesión hacia el dashboard público.
