## Context

HumWorld es una aplicación React/Vite que consume una API FastAPI mediante rutas relativas `/api`. El router del frontend ya separa el landing `/` del `AppShell`, pero no existe proveedor de identidad ni el cliente HTTP adjunta credenciales. FastAPI registra todos los routers bajo `/api/v1` sin dependencias de seguridad y genera un contrato OpenAPI personalizado en `/api/openapi.json`; Swagger se publica en `/api/docs`.

La autenticación atraviesa frontend, backend, configuración, documentación y pruebas, y agrega a Clerk como dependencia externa. La motivación y la matriz de acceso están en `proposal.md` y en las especificaciones de este cambio.

## Goals / Non-Goals

**Goals:**

- Mantener la autorización efectiva en el backend aunque alguien evite las protecciones del navegador.
- Aislar la disponibilidad del landing y de sus tres consultas públicas respecto de la carga o disponibilidad de Clerk.
- Hacer explícita la seguridad por operación en FastAPI para evitar excepciones basadas en coincidencias de URL.
- Permitir configurar y probar desarrollo y producción con identidades Clerk independientes, autorizar dos cuentas en producción y sin introducir una tabla local de usuarios.
- Mantener los errores de autenticación distinguibles: credencial inválida (`401`), identidad válida no autorizada (`403`) y configuración de autenticación no operativa (`503`).

**Non-Goals:**

- Registro público, proveedores sociales, MFA, TOTP, roles múltiples o administración de usuarios desde HumWorld.
- Sincronizar perfiles Clerk con PostgreSQL o mantener sesiones propias del backend.
- Proteger Swagger, el esquema OpenAPI o los tres endpoints consumidos por el landing.
- Cambiar los datos, filtros o formas de respuesta actuales del landing y del dashboard.

## Decisions

### 1. Usar dos instancias Clerk y una lista explícita de administradores

Se configurará una instancia Development para localhost y una instancia Production para el despliegue. En cada una se habilitará correo y contraseña, recuperación por correo y acceso restringido; se deshabilitarán proveedores sociales, registro público, MFA y TOTP. Las cuentas se crearán manualmente y sus `user_id` se almacenarán como lista separada por comas en `CLERK_ADMIN_USER_IDS`. Producción tendrá los dos identificadores de las cuentas administrativas; localhost podrá tener una o más cuentas según se necesite.

El backend comparará el claim `sub` del token validado con cada identificador de la lista. Una lista vacía, malformada o con elementos vacíos hará fallar la autorización de forma cerrada. La misma dirección de correo puede existir en ambos ambientes, pero sus identificadores y credenciales no se compartirán.

**Alternativas consideradas:** autorizar por correo permitiría una configuración más legible, pero el correo es un atributo mutable y requiere confiar en claims adicionales; usar identificadores inmutables de Clerk reduce ambigüedad. Una tabla local de roles sería innecesaria para las dos cuentas previstas y ampliaría el alcance de persistencia y sincronización.

### 2. Cargar Clerk solamente en el subárbol de autenticación

El router mantendrá `/` fuera del proveedor Clerk. Un layout de autenticación envolverá `/sign-in` y el subárbol protegido que contiene `/dashboard`, `/fuentes`, `/dictionary` y `/parametros`. Así el landing puede renderizar y consultar sus endpoints aun si el SDK de Clerk no carga o la clave pública falta.

La pantalla `/sign-in` usará `useSignIn` de `@clerk/react` para presentar correo y contraseña simultáneamente y completar el acceso mediante la estrategia password, sin enlace de registro ni botones de proveedores sociales. Cuando Clerk devuelva `needs_client_trust` (o el estado legacy `needs_second_factor`) y ofrezca `email_code`, la interfaz enviará el código de Device Trust, solicitará su ingreso y finalizará la sesión. Este desafío automático protege inicios desde dispositivos nuevos; el producto no ofrecerá inscripción voluntaria a MFA ni TOTP. La recuperación por correo se implementará sobre los métodos de restablecimiento de Clerk, y el proveedor usará la localización oficial en español. Un guard esperará el estado inicial de Clerk, redirigirá usuarios sin sesión al inicio de sesión y conservará la ubicación solicitada. El shell mostrará el correo activo y cerrará la sesión hacia `/`.

**Alternativas consideradas:** envolver toda la aplicación con `ClerkProvider` simplifica el árbol, pero vuelve la ruta pública dependiente de la inicialización del proveedor. El componente prediseñado de Clerk conserva más interfaz gestionada, pero separa identificador y contraseña en pasos distintos; el formulario propio no almacena credenciales y delega el acceso, la recuperación y la sesión en los métodos oficiales del SDK.

### 3. Inyectar el token mediante una frontera única del cliente HTTP

El subárbol autenticado registrará en el cliente HTTP una función asíncrona que obtiene el token de la sesión activa. Antes de cada solicitud, el cliente adjuntará `Authorization: Bearer <token>` cuando exista; las consultas anónimas seguirán funcionando sin encabezado. El cliente conservará su manejo actual de cuerpos y errores.

La configuración del cliente HTTP permanecerá estable durante toda la sesión y no se desmontará al cambiar de ruta administrativa. La ruta de retorno se mantendrá en una referencia independiente. Un `401` solo invalidará la sesión cuando la solicitud rechazada haya sido enviada con Bearer, evitando que una solicitud iniciada durante una transición transitoria cierre una sesión válida.

La obtención del token permanecerá fuera de los módulos de dominio para que Fuentes, Diccionario, Parámetros y Dashboard no dependan directamente de hooks de Clerk. Ante `401`, la interfaz llevará al inicio de sesión; ante `403`, mostrará un estado de acceso denegado y permitirá cerrar la sesión, evitando tratar ambos casos como una falla genérica.

**Alternativas consideradas:** pasar el token manualmente en cada servicio haría visible la autenticación en toda la aplicación y facilitaría omisiones. Usar cookies propias requeriría un backend de sesión adicional y gestión CSRF.

### 4. Autorizar con dependencias FastAPI por router y por operación

El backend incorporará el SDK oficial de Clerk para Python y una dependencia `require_admin`. La dependencia utilizará un esquema HTTP Bearer no automático, validará el token con la clave JWT de Clerk, verificará vigencia, emisor y `azp` contra `CLERK_AUTHORIZED_PARTIES`, y finalmente comprobará que `sub` pertenezca a `CLERK_ADMIN_USER_IDS`.

Los routers completamente administrativos se incluirán con la dependencia en el nivel del router. El router de dashboard tendrá seguridad por operación: `/dashboards`, `/nube-palabras` y `/noticias-influyentes` permanecerán sin dependencia; `/geografia`, `/evolucion` y `/noticias/{id}/terminos` la declararán explícitamente. Swagger y OpenAPI quedan fuera de `/api/v1` y continúan públicos.

Esta estructura permite que FastAPI refleje el esquema Bearer solo en las operaciones protegidas. El generador OpenAPI conservará la eliminación del `422` y añadirá descripciones reutilizables de `401`, `403` y `503` donde corresponda.

**Alternativas consideradas:** un middleware global con lista de excepciones reduce cambios en routers, pero una coincidencia incorrecta de prefijos podría publicar accidentalmente una operación nueva. Las dependencias declarativas hacen la política visible, verificable y documentable junto a cada endpoint.

### 5. Separar errores de autenticación, autorización y operación

La dependencia responderá:

- `401` y encabezado `WWW-Authenticate: Bearer` cuando falte el token o falle su validación.
- `403` cuando el token sea válido pero `sub` no aparezca en la lista de cuentas administrativas.
- `503` cuando falte configuración obligatoria o el verificador no pueda operar por una condición interna; el detalle no expondrá claves ni tokens.

La comprobación del administrador se ejecutará antes de cualquier servicio, repositorio o mutación. Los handlers existentes de `400`, `404` y `500` continuarán aplicándose después de autorizar.

**Alternativas consideradas:** devolver siempre `401` ocultaría la diferencia entre una credencial defectuosa y una cuenta Clerk válida que no tiene permiso, dificultando diagnóstico y pruebas. El `403` no depende de que existan varios usuarios habituales; protege contra errores de configuración, tokens de otro usuario y futuras cuentas accidentales.

### 6. Configurar secretos fuera del repositorio y permitir inicio público

La raíz y Compose propagarán al backend `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `CLERK_ADMIN_USER_IDS` y `CLERK_AUTHORIZED_PARTIES`; el frontend recibirá solamente `VITE_CLERK_PUBLISHABLE_KEY`. `CLERK_ADMIN_USER_IDS` aceptará una lista separada por comas de identificadores `user_...`: producción configurará dos valores y localhost al menos uno. Los `.env.example` documentarán nombres y formatos sin valores utilizables. `CLERK_AUTHORIZED_PARTIES` aceptará una lista separada por comas; localhost usará `http://localhost:5173` y producción su origen HTTPS.

Los ajustes de autenticación se validarán de manera diferida al entrar en una operación protegida, no como requisito para iniciar FastAPI, de modo que los endpoints públicos sigan disponibles. La configuración inválida nunca desactivará la dependencia ni concederá acceso por defecto.

**Alternativas consideradas:** fallar el proceso completo durante el arranque detecta antes una configuración ausente, pero también derriba el landing público y contradice el aislamiento requerido. Usar claves de producción en localhost mezclaría usuarios, telemetría y permisos, además de aumentar el impacto de una filtración.

### 7. Probar sin depender de servicios Clerk reales

Las pruebas del backend reemplazarán el verificador Clerk por dobles controlados y comprobarán la dependencia tanto de forma aislada como a través de operaciones públicas y protegidas. Se cubrirán token ausente, inválido/expirado, emisor u origen incorrecto, administrador válido, usuario válido no administrador y configuración incompleta. También se verificará el documento OpenAPI.

Las pruebas del frontend usarán un proveedor Clerk simulado para verificar carga pública, redirección, retorno a la ruta original, inclusión del Bearer, representación de `403` y cierre de sesión. La validación manual final utilizará la instancia Development y la cuenta creada para localhost.

**Alternativas consideradas:** ejecutar toda la suite contra Clerk haría las pruebas más lentas, dependientes de red y de secretos. Se reservará una comprobación real para la validación de despliegue, no para las pruebas deterministas habituales.

## Risks / Trade-offs

- [Una cuenta adicional creada por error en Clerk puede iniciar sesión] → El backend permite únicamente los `sub` enumerados en `CLERK_ADMIN_USER_IDS` y devuelve `403` para cualquier otro; además, el ambiente se configura con acceso restringido.
- [Una ruta nueva bajo `/api/v1` puede quedar pública si se olvida la dependencia] → Incluir routers administrativos con dependencia por defecto, mantener una prueba que enumere operaciones sin seguridad y permitir únicamente las tres rutas públicas declaradas.
- [Una clave JWT rotada puede invalidar la verificación local] → Documentar la actualización coordinada de `CLERK_JWT_KEY` y validar una sesión real después de rotar; no degradar a acceso sin verificación.
- [La primera implantación puede bloquear al administrador por un `user_id` o `azp` incorrecto] → Probar en local ambas cuentas Development y entregar al encargado los identificadores y orígenes Production correspondientes para que los configure durante el despliegue.
- [El frontend y backend desplegados en momentos distintos pueden ser temporalmente incompatibles] → Desplegar coordinadamente; el backend primero bloquearía al frontend antiguo y el frontend primero recibiría respuestas normales de un backend aún público, por lo que se recomienda una ventana breve y verificación inmediata.
- [Mantener tres endpoints públicos permite consultas fuera del landing] → Se acepta conscientemente porque los datos no son sensibles; permanecen vigentes la validación de parámetros y los límites actuales de respuesta.
- [Sin MFA, la contraseña es el único factor] → Usar contraseñas únicas y robustas para las cuentas administrativas, conservar recuperación por correo y limitar la superficie a las cuentas explícitamente configuradas; MFA queda explícitamente fuera del alcance solicitado.
- [Una transición entre rutas puede iniciar solicitudes antes de reinstalar el token] → Mantener una única frontera HTTP por sesión, no ligarla a la ubicación y probar la navegación bajo `StrictMode` para impedir solicitudes protegidas anónimas.

## Migration Plan

1. Crear y configurar las instancias Clerk Development y Production con correo/contraseña, recuperación y acceso restringido; crear manualmente las dos cuentas de prueba Development y las dos cuentas administrativas Production.
2. Configurar y validar localmente las dos cuentas Development. Preparar para el encargado de despliegue la lista de variables Production, el formato esperado y dónde obtener los valores de la instancia productiva; el encargado completará los dos IDs y el origen productivo directamente en su proveedor.
3. Incorporar dependencias, configuración y pruebas del backend; confirmar que Swagger marca solo las operaciones protegidas y que los tres endpoints públicos siguen respondiendo sin token.
4. Incorporar el proveedor acotado, inicio de sesión, guard, token y cierre de sesión en el frontend; validar que `/` no depende de Clerk.
5. Actualizar Compose y las plantillas de ambiente, levantar el stack local y ejecutar pruebas automatizadas y una sesión real de extremo a extremo.
6. Entregar al encargado de despliegue la configuración Production necesaria para que la cargue en su proveedor. La carga y las pruebas de Production son responsabilidad del encargado y quedan fuera de la validación local de este cambio.
7. Ante un fallo local, corregir la configuración Development antes de entregar los valores. Las cuentas Clerk pueden permanecer creadas porque no existe migración de datos ni dependencia en PostgreSQL; retirar o rotar los secretos si se sospecha exposición.
