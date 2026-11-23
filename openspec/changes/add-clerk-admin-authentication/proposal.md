## Why

HumWorld expone actualmente el dashboard y las funciones administrativas sin control de acceso, por lo que cualquier persona que conozca sus rutas puede utilizarlos. Se requiere restringir esas funciones a las identidades administrativas configuradas por ambiente —dos en producción—, sin alterar los datos públicos que consume el landing.

## What Changes

- Integrar Clerk como proveedor de identidad mediante correo electrónico y contraseña, sin proveedores sociales, registro público, MFA ni TOTP.
- Permitir que cada ambiente configure una lista explícita de cuentas administrativas autorizadas; producción admitirá dos cuentas y desarrollo local podrá usar una o más, manteniendo identidades independientes entre ambientes.
- Incorporar una pantalla pública de inicio de sesión con correo y contraseña simultáneos, recuperación de contraseña por correo, y un desafío condicional de código por correo cuando Clerk solicite confiar en un dispositivo nuevo; permitir cierre de sesión y retorno al dashboard después de autenticar.
- Proteger las rutas de frontend `/dashboard`, `/fuentes`, `/dictionary` y `/parametros`, conservando `/` como landing público.
- Mantener públicos `GET /api/v1/dashboards`, `GET /api/v1/dashboards/nube-palabras` y `GET /api/v1/dashboards/noticias-influyentes`, porque alimentan el landing y no contienen información sensible.
- Exigir un token Clerk válido y que su sujeto coincida con uno de los administradores configurados para los demás endpoints de `/api/v1`; responder `401` ante credenciales ausentes o inválidas y `403` ante una identidad Clerk válida que no esté en la lista autorizada.
- Mantener Swagger y el esquema OpenAPI públicos, documentando autenticación Bearer y las respuestas de autorización en las operaciones protegidas.
- Configurar Clerk mediante variables de entorno separadas para frontend y backend, sin persistir claves ni secretos en el repositorio.

## Capabilities

### New Capabilities

- `admin-authentication`: Autenticación Clerk de cuentas administrativas explícitamente permitidas (dos en producción), recuperación y cierre de sesión, protección de rutas y endpoints, matriz de recursos públicos y respuestas `401`/`403`.

### Modified Capabilities

- `frontend/app-shell`: Cambia el acceso a la raíz para conservar el landing público e incorpora el límite autenticado del shell administrativo.
- `dashboard-aggregation`: Define cuáles consultas del dashboard permanecen públicas y cuáles requieren la sesión administrativa, y publica esa seguridad en OpenAPI.

## Impact

- Frontend React/Vite: proveedor Clerk, rutas públicas y protegidas, pantalla de inicio de sesión, cliente HTTP con token Bearer y controles de sesión en el shell.
- Backend FastAPI: validación de JWT de Clerk, comprobación del usuario administrativo, dependencias de autorización y clasificación explícita de routers públicos/protegidos.
- Contrato API: esquema de seguridad Bearer y respuestas `401`/`403` para operaciones protegidas, sin cambiar las rutas ni los datos usados por el landing.
- Configuración y despliegue: nuevas variables `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `CLERK_ADMIN_USER_IDS` (lista separada por comas) y `CLERK_AUTHORIZED_PARTIES`, con valores distintos para desarrollo y producción.
- Validación operativa del cambio: probar en localhost las dos cuentas Development autorizadas y preparar la lista de variables para entregar al encargado de Production. La configuración y las pruebas del ambiente productivo quedan a cargo de ese encargado.
- Dependencias y pruebas: SDKs oficiales de Clerk y cobertura automatizada de acceso público, administrador válido, token inválido o expirado, usuario no autorizado, redirección y cierre de sesión.
