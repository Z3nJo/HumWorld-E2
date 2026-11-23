## Purpose

Restringir las funciones administrativas de HumWorld a las identidades autorizadas por ambiente —dos en producción—, conservando el landing y sus consultas de solo lectura disponibles públicamente.

## ADDED Requirements

### Requirement: Cuentas administrativas explícitas por ambiente
El sistema SHALL delegar la autenticación en Clerk y SHALL autorizar como administrador únicamente a los usuarios cuyos identificadores estén incluidos en la lista configurada para el ambiente actual. Producción MUST permitir configurar dos cuentas administrativas. Desarrollo local MAY configurar una o más cuentas. Desarrollo y producción MUST usar instancias y credenciales de Clerk independientes, por lo que cada cuenta se SHALL crear y configurar separadamente en cada ambiente, aunque utilice la misma dirección de correo.

#### Scenario: Acceder con cualquiera de los administradores configurados
- **WHEN** una sesión Clerk válida pertenece a uno de los identificadores administrativos configurados en el ambiente actual
- **THEN** el sistema autoriza el acceso a las funciones protegidas

#### Scenario: Configurar dos administradores en producción
- **WHEN** producción se configura con los identificadores Clerk de dos cuentas administrativas válidas
- **THEN** ambas cuentas pueden iniciar sesión y acceder a las funciones protegidas

#### Scenario: Rechazar una cuenta que no está en la lista
- **WHEN** una sesión Clerk válida pertenece a un usuario cuyo identificador no está configurado en el ambiente actual
- **THEN** el sistema responde `403` y no ejecuta la operación protegida

#### Scenario: Usar la identidad del ambiente equivocado
- **WHEN** se presenta una sesión emitida por una instancia Clerk distinta de la configurada para el ambiente actual
- **THEN** el sistema rechaza la credencial con `401`

### Requirement: Inicio y cierre de sesión sin registro público
El sistema SHALL permitir iniciar sesión mediante correo electrónico y contraseña y recuperar la contraseña mediante correo electrónico. La pantalla SHALL mostrar ambos campos de acceso simultáneamente y presentar su interfaz en español. Si Clerk exige verificación automática de Device Trust para un dispositivo nuevo, el sistema SHALL permitir verificar un código enviado por correo y completar la sesión. MUST NOT ofrecer registro público, proveedores sociales, MFA configurable por usuario ni TOTP. El usuario autenticado SHALL poder cerrar la sesión y volver al landing público.

#### Scenario: Iniciar sesión con la cuenta administrativa
- **WHEN** el administrador ingresa credenciales válidas en `/sign-in`
- **THEN** el sistema establece la sesión y lo dirige a la ruta protegida que intentaba visitar o a `/dashboard` si no existe una ruta pendiente

#### Scenario: Mostrar el formulario administrativo
- **WHEN** una persona visita `/sign-in`
- **THEN** la interfaz muestra en español los campos de correo y contraseña en una misma pantalla, sin registro ni proveedores sociales

#### Scenario: Verificar un dispositivo nuevo
- **WHEN** Clerk solicita Device Trust después de validar el correo y contraseña
- **THEN** la interfaz permite ingresar el código enviado al correo y completa la sesión al verificarlo

#### Scenario: Intentar registrar una cuenta
- **WHEN** una persona no autenticada navega por la aplicación
- **THEN** la interfaz no ofrece una ruta ni una acción de registro

#### Scenario: Recuperar una contraseña
- **WHEN** el administrador solicita recuperar su contraseña desde el inicio de sesión
- **THEN** Clerk envía y procesa el flujo de recuperación mediante el correo asociado a la cuenta

#### Scenario: Cerrar la sesión
- **WHEN** el administrador activa la acción de cierre de sesión
- **THEN** la sesión se invalida en el cliente y el navegador vuelve a `/`

### Requirement: Protección de rutas administrativas del frontend
Las rutas `/dashboard`, `/fuentes`, `/dictionary` y `/parametros` SHALL requerir una sesión Clerk activa. Las rutas `/` y `/sign-in` SHALL permanecer públicas. Cuando una persona no autenticada solicite una ruta protegida, el sistema MUST redirigirla a `/sign-in` conservando la ruta solicitada para continuar después de autenticar.

#### Scenario: Abrir directamente el dashboard sin sesión
- **WHEN** una persona no autenticada navega a `/dashboard`
- **THEN** el navegador la redirige a `/sign-in` y conserva `/dashboard` como destino posterior

#### Scenario: Visitar el landing sin sesión
- **WHEN** una persona no autenticada navega a `/`
- **THEN** el landing se renderiza sin exigir una sesión Clerk

#### Scenario: Continuar después de autenticar
- **WHEN** el administrador completa el inicio de sesión después de ser redirigido desde una ruta protegida
- **THEN** el navegador vuelve a la ruta protegida solicitada originalmente

#### Scenario: Navegar entre pantallas administrativas
- **WHEN** el administrador autenticado cambia entre `/dashboard`, `/fuentes`, `/dictionary` y `/parametros`
- **THEN** el sistema conserva la sesión y adjunta el token Bearer desde la primera solicitud protegida de cada pantalla

### Requirement: Política de acceso de la API
La API SHALL permitir acceso anónimo exclusivamente a `GET /api/v1/dashboards`, `GET /api/v1/dashboards/nube-palabras` y `GET /api/v1/dashboards/noticias-influyentes`. Todas las demás operaciones bajo `/api/v1` MUST requerir autorización administrativa. La documentación Swagger `/api/docs` y el esquema `/api/openapi.json` SHALL permanecer accesibles sin autenticación.

#### Scenario: Consumir los datos del landing anónimamente
- **WHEN** el landing invoca cualquiera de las tres operaciones públicas sin encabezado `Authorization`
- **THEN** la API procesa la consulta con las mismas validaciones y datos existentes

#### Scenario: Invocar otra operación sin credenciales
- **WHEN** un cliente invoca cualquier otra operación bajo `/api/v1` sin credenciales
- **THEN** la API responde `401` sin ejecutar la operación protegida

#### Scenario: Consultar Swagger anónimamente
- **WHEN** un cliente solicita `/api/docs` o `/api/openapi.json` sin credenciales
- **THEN** el servidor publica la documentación solicitada

### Requirement: Validación y autorización del token
Cada operación protegida MUST aceptar un token de sesión Clerk mediante el esquema Bearer y MUST verificar su firma, vigencia, emisor y origen autorizado antes de procesar la solicitud. Después de validar el token, el sistema MUST comprobar que su sujeto está incluido en la lista de identificadores administrativos configurada. SHALL responder `401` si el token falta, es inválido, está expirado o pertenece a otra instancia, y SHALL responder `403` si el token es válido pero su sujeto no pertenece a esa lista.

#### Scenario: Token de una cuenta administrativa válida
- **WHEN** una operación protegida recibe un token válido cuyo sujeto coincide con cualquiera de los administradores configurados
- **THEN** la solicitud continúa hacia la operación solicitada

#### Scenario: Token ausente o inválido
- **WHEN** una operación protegida no recibe token o recibe uno que falla alguna validación criptográfica o temporal
- **THEN** la API responde `401`

#### Scenario: Usuario Clerk fuera de la lista administrativa
- **WHEN** una operación protegida recibe un token válido cuyo sujeto no está configurado como administrador
- **THEN** la API responde `403` sin ejecutar la operación

### Requirement: Configuración segura y falla cerrada
El sistema SHALL obtener las claves de Clerk, la lista de identificadores administrativos y los orígenes autorizados desde configuración externa al código versionado. La lista administrativa MUST contener al menos un identificador no vacío y MUST NOT autorizar usuarios omitidos de ella; en producción se configurarán exactamente las dos cuentas previstas. Los secretos del backend MUST NOT exponerse al frontend ni almacenarse en el repositorio. Si la configuración de autenticación es inválida o Clerk no permite validar una sesión, las funciones protegidas MUST fallar de forma cerrada, mientras el landing y las tres consultas públicas SHALL continuar disponibles.

#### Scenario: Falta una configuración obligatoria del backend
- **WHEN** el backend intenta autorizar una operación protegida sin la configuración Clerk requerida
- **THEN** la operación no concede acceso ni utiliza un valor de respaldo inseguro

#### Scenario: Clerk no está disponible durante una visita pública
- **WHEN** una persona visita el landing mientras Clerk no está disponible
- **THEN** el landing y sus consultas públicas continúan funcionando sin requerir autenticación

#### Scenario: Verificar separación de secretos
- **WHEN** se inspecciona la aplicación construida y la configuración versionada
- **THEN** la clave secreta y el material privado de verificación del backend no están presentes en los recursos entregados al navegador ni en el repositorio
