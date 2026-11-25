## Purpose

Restringir las funciones administrativas de HumWorld a los usuarios registrados en la instancia Clerk dedicada de cada ambiente, conservando el landing, el dashboard y sus consultas analíticas disponibles públicamente.

## ADDED Requirements

### Requirement: Usuarios administrativos de la instancia por ambiente
El sistema SHALL delegar la autenticación en Clerk y SHALL autorizar como administrador a todo usuario con una sesión válida emitida por la instancia Clerk dedicada del ambiente actual. Desarrollo y producción MUST usar instancias y credenciales Clerk independientes, MUST mantener deshabilitado el registro público y SHALL gestionar sus cuentas dentro de Clerk sin replicar identificadores de usuario en la configuración de HumWorld.

#### Scenario: Acceder con un usuario registrado en la instancia
- **WHEN** una sesión Clerk válida pertenece a cualquier usuario registrado en la instancia del ambiente actual
- **THEN** el sistema autoriza el acceso a las funciones protegidas

#### Scenario: Incorporar otro administrador sin cambiar el ambiente
- **WHEN** se crea otro usuario en la instancia Clerk con registro público deshabilitado
- **THEN** ese usuario puede autenticarse y acceder a las funciones protegidas sin agregar su identificador a variables de entorno ni desplegar nuevamente HumWorld

#### Scenario: Usar la identidad del ambiente equivocado
- **WHEN** se presenta una sesión emitida por una instancia Clerk distinta de la configurada para el ambiente actual
- **THEN** el sistema rechaza la credencial con `401`

### Requirement: Inicio y cierre de sesión sin registro público
El sistema SHALL permitir iniciar sesión mediante correo electrónico y contraseña y recuperar la contraseña mediante correo electrónico. La pantalla SHALL mostrar ambos campos de acceso simultáneamente y presentar su interfaz en español. Si Clerk exige verificación automática de Device Trust para un dispositivo nuevo, el sistema SHALL permitir verificar un código enviado por correo y completar la sesión. MUST NOT ofrecer registro público, proveedores sociales, MFA configurable por usuario ni TOTP. Cuando el acceso se inicie sin una ruta administrativa pendiente, el sistema SHALL volver a `/dashboard`; cuando provenga de una ruta protegida, SHALL conservarla como destino. El usuario autenticado SHALL poder cerrar la sesión y permanecer en `/dashboard` con su presentación pública.

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
- **THEN** la sesión se invalida en el cliente, el navegador permanece en `/dashboard` y la navegación vuelve a su presentación pública

### Requirement: Protección de rutas administrativas del frontend
Las rutas `/fuentes`, `/dictionary` y `/parametros` SHALL requerir una sesión Clerk activa. Las rutas `/`, `/dashboard` y `/sign-in` SHALL permanecer públicas. Cuando una persona no autenticada solicite una ruta protegida, el sistema MUST redirigirla a `/sign-in` conservando la ruta solicitada para continuar después de autenticar. El dashboard SHALL mantener disponibles sus datos y controles de consulta sin sesión; una sesión activa SHALL ampliar su navegación con los módulos administrativos sin cambiar la ruta ni reemplazar el contenido analítico.

#### Scenario: Abrir directamente el dashboard sin sesión
- **WHEN** una persona no autenticada navega a `/dashboard`
- **THEN** el navegador muestra el dashboard completo con navegación pública y una acción de acceso administrativo, sin redirigir a `/sign-in`

#### Scenario: Visitar el landing sin sesión
- **WHEN** una persona no autenticada navega a `/`
- **THEN** el landing se renderiza sin exigir una sesión Clerk

#### Scenario: Continuar después de autenticar
- **WHEN** el administrador completa el inicio de sesión después de ser redirigido desde una ruta protegida
- **THEN** el navegador vuelve a la ruta protegida solicitada originalmente

#### Scenario: Volver al dashboard después del acceso administrativo
- **WHEN** una persona inicia el acceso administrativo desde el dashboard y completa una autenticación autorizada
- **THEN** el navegador vuelve a `/dashboard` y muestra los módulos administrativos, la cuenta activa y el cierre de sesión

#### Scenario: Navegar entre pantallas administrativas
- **WHEN** el administrador autenticado cambia entre `/dashboard`, `/fuentes`, `/dictionary` y `/parametros`
- **THEN** el sistema conserva la sesión, mantiene pública la consulta del dashboard y adjunta el token Bearer desde la primera solicitud protegida de cada módulo administrativo

### Requirement: Política de acceso de la API
La API SHALL permitir acceso anónimo a las seis consultas analíticas `GET /api/v1/dashboards`, `GET /api/v1/dashboards/geografia`, `GET /api/v1/dashboards/evolucion`, `GET /api/v1/dashboards/nube-palabras`, `GET /api/v1/dashboards/noticias-influyentes` y `GET /api/v1/dashboards/noticias/{id}/terminos`. Todas las demás operaciones bajo `/api/v1` MUST requerir autorización administrativa. La documentación Swagger `/api/docs` y el esquema `/api/openapi.json` SHALL permanecer accesibles sin autenticación.

#### Scenario: Consumir los datos del dashboard anónimamente
- **WHEN** el landing o el dashboard invoca cualquiera de las seis operaciones públicas sin encabezado `Authorization`
- **THEN** la API procesa la consulta con las mismas validaciones y datos existentes

#### Scenario: Invocar otra operación sin credenciales
- **WHEN** un cliente invoca cualquier otra operación bajo `/api/v1` sin credenciales
- **THEN** la API responde `401` sin ejecutar la operación protegida

#### Scenario: Consultar Swagger anónimamente
- **WHEN** un cliente solicita `/api/docs` o `/api/openapi.json` sin credenciales
- **THEN** el servidor publica la documentación solicitada

### Requirement: Validación y autorización del token
Cada operación protegida MUST aceptar un token de sesión Clerk mediante el esquema Bearer y MUST verificar su firma, vigencia, emisor, sujeto y origen autorizado antes de procesar la solicitud. Una vez validado el token contra la instancia configurada, el sistema SHALL autorizar a su sujeto sin exigir una lista adicional de identificadores. SHALL responder `401` si el token falta, es inválido, está expirado o pertenece a otra instancia.

#### Scenario: Token de un usuario válido de la instancia
- **WHEN** una operación protegida recibe un token válido emitido por la instancia Clerk configurada
- **THEN** la solicitud continúa hacia la operación solicitada con independencia del identificador concreto de su sujeto

#### Scenario: Token ausente o inválido
- **WHEN** una operación protegida no recibe token o recibe uno que falla alguna validación criptográfica o temporal
- **THEN** la API responde `401`

### Requirement: Configuración segura y falla cerrada
El sistema SHALL obtener las claves de Clerk y los orígenes autorizados desde configuración externa al código versionado, y MUST NOT requerir una lista de identificadores de usuario. Los secretos del backend MUST NOT exponerse al frontend ni almacenarse en el repositorio. La instancia Clerk del ambiente MUST mantener deshabilitado el registro público, porque pertenecer a ella concede acceso administrativo. Si la configuración de autenticación es inválida, Clerk todavía está cargando o no permite validar una sesión, las funciones protegidas MUST fallar de forma cerrada, mientras el landing, el dashboard y las seis consultas públicas SHALL continuar disponibles.

#### Scenario: Falta una configuración obligatoria del backend
- **WHEN** el backend intenta autorizar una operación protegida sin la configuración Clerk requerida
- **THEN** la operación no concede acceso ni utiliza un valor de respaldo inseguro

#### Scenario: Clerk no está disponible durante una visita pública
- **WHEN** una persona visita el landing o el dashboard mientras Clerk no está disponible
- **THEN** ambas rutas y las seis consultas analíticas continúan funcionando sin requerir autenticación

#### Scenario: Verificar separación de secretos
- **WHEN** se inspecciona la aplicación construida y la configuración versionada
- **THEN** la clave secreta y el material privado de verificación del backend no están presentes en los recursos entregados al navegador ni en el repositorio
