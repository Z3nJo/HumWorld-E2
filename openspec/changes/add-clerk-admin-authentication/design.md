## Context

HumWorld es una aplicación React/Vite que consume una API FastAPI mediante rutas relativas `/api`. La implementación actual mantiene `/` fuera de Clerk, pero incluye `/dashboard` dentro del mismo límite autenticado que `/fuentes`, `/dictionary` y `/parametros`. `AppShell` combina la estructura visual del sidebar con hooks de Clerk, por lo que tampoco puede montar el dashboard anónimamente sin separar ambas responsabilidades. FastAPI registra los routers administrativos bajo dependencias de autorización y todavía protege tres de las seis consultas analíticas del dashboard. El contrato OpenAPI personalizado se publica en `/api/openapi.json` y Swagger en `/api/docs`.

La autenticación atraviesa frontend, backend, configuración, documentación y pruebas, y agrega a Clerk como dependencia externa. La motivación y la matriz de acceso están en `proposal.md` y en las especificaciones de este cambio.

## Goals / Non-Goals

**Goals:**

- Mantener la autorización efectiva en el backend aunque alguien evite las protecciones del navegador.
- Aislar la disponibilidad del landing, el dashboard y sus seis consultas analíticas respecto de la carga o disponibilidad de Clerk.
- Conservar el mismo dashboard y lenguaje visual antes y después de autenticar, ampliando únicamente su navegación cuando exista una sesión.
- Limitar la readaptación a la frontera de acceso, la composición del shell y la clasificación de las consultas analíticas.
- Hacer explícita la seguridad por operación en FastAPI para evitar excepciones basadas en coincidencias de URL.
- Permitir configurar y probar desarrollo y producción con instancias Clerk independientes, autorizando automáticamente a sus usuarios sin introducir una lista paralela ni una tabla local.
- Mantener distinguibles la credencial inválida (`401`) y la configuración de autenticación no operativa (`503`), sin una capa adicional de permisos por usuario.

**Non-Goals:**

- Registro público, proveedores sociales, MFA, TOTP, roles múltiples o administración de usuarios desde HumWorld.
- Sincronizar perfiles Clerk con PostgreSQL o mantener sesiones propias del backend.
- Proteger Swagger, el esquema OpenAPI o cualquiera de las seis consultas analíticas del dashboard.
- Cambiar los datos, filtros o formas de respuesta actuales del landing y del dashboard.
- Rediseñar el landing, el dashboard o el sidebar; introducir una ruta `/admin`; renombrar rutas existentes; crear roles granulares o un endpoint nuevo para consultar permisos.
- Hacer públicas las consultas de fuentes, diccionario o parámetros por el solo hecho de utilizar `GET`.

## Decisions

### 1. Usar la instancia Clerk como frontera de confianza administrativa

Se configurará una instancia Development para localhost y una instancia Production para el despliegue. En cada una se habilitará correo y contraseña, recuperación por correo y acceso restringido; se deshabilitarán proveedores sociales, registro público, MFA y TOTP. Las cuentas se crearán y administrarán dentro de Clerk. Todo usuario capaz de presentar una sesión válida de la instancia del ambiente será administrador de HumWorld, sin copiar sus `user_id` a variables de entorno.

El backend validará criptográficamente el token, su vigencia, emisor, origen y presencia de `sub`; después aceptará cualquier sujeto válido de esa instancia. La misma dirección de correo puede existir en ambos ambientes, pero sus cuentas, sesiones y credenciales no se compartirán. Crear una cuenta en la instancia equivale explícitamente a conceder acceso administrativo, por lo que el registro público debe permanecer deshabilitado.

**Alternativas consideradas:** mantener `CLERK_ADMIN_USER_IDS` ofrece una segunda lista de control, pero obliga a sincronizar Clerk y cada despliegue por cada alta o baja. Los roles, organizaciones o metadata de Clerk permitirían distinguir perfiles si existieran usuarios no administrativos, pero ampliarían el alcance sin aportar valor mientras la instancia sea exclusiva para administradores. Una tabla local también introduciría persistencia y sincronización innecesarias.

### 2. Tratar la sesión del dashboard como una mejora progresiva

El router mantendrá `/` y `/dashboard` fuera de `ProtectedRoute`. `/fuentes`, `/dictionary` y `/parametros` continuarán bajo el layout de autenticación y el guard obligatorio. El dashboard utilizará una frontera opcional de sesión: sin clave pública renderizará directamente la presentación pública; con una clave configurada permitirá que Clerk resuelva la sesión sin retrasar ni sustituir el contenido analítico. Mientras el estado todavía carga se conservará la navegación pública, y una falla de inicialización deberá degradar a esa misma presentación.

El contenido del dashboard y sus consultas no se condicionarán a `isLoaded` ni `isSignedIn`. Una sesión activa solo ampliará el sidebar con Fuentes y canales, Diccionario, Parámetros, el correo de la cuenta y el cierre de sesión. La estructura visual del shell se separará de los hooks Clerk para reutilizar el mismo marcado, estilos y comportamiento adaptable en ambos estados, evitando duplicar un shell público. La presentación anónima mostrará el Dashboard de humor y una única acción de acceso administrativo.

La pantalla `/sign-in` conservará su formulario actual con correo, contraseña, recuperación y Device Trust. El acceso iniciado desde el dashboard volverá por defecto a `/dashboard`; el guard seguirá preservando `/fuentes`, `/dictionary` o `/parametros` cuando una de esas rutas originó la redirección. Cerrar sesión navegará o permanecerá en `/dashboard`, donde el shell volverá a su presentación pública sin desmontar el contenido analítico.

**Alternativas consideradas:** mantener visibles los tres módulos para visitantes produce opciones que solo redirigen y aumenta el ruido de una experiencia orientada a consulta. Crear un portal o shell público distinto duplicaría estructura y estilos. Envolver el dashboard en el mismo guard administrativo volvería a bloquearlo, mientras omitir por completo la detección de sesión impediría revelar la administración después de volver a `/dashboard`.

### 3. Inyectar el token mediante una frontera única del cliente HTTP

El subárbol administrativo registrará en el cliente HTTP una función asíncrona que obtiene el token de la sesión activa. Antes de cada solicitud administrativa, el cliente adjuntará `Authorization: Bearer <token>` cuando exista. El dashboard permanecerá fuera de esa frontera y realizará sus seis consultas sin encabezado, incluso cuando el shell haya detectado una sesión activa. El cliente conservará su manejo actual de cuerpos y errores.

La configuración del cliente HTTP permanecerá estable durante la navegación entre módulos administrativos y se retirará al volver al dashboard público. La ruta de retorno se mantendrá en una referencia independiente. Un `401` solo invalidará la sesión cuando la solicitud rechazada haya sido enviada con Bearer, evitando que una consulta pública o una transición cierre una sesión válida.

La obtención del token permanecerá fuera de los módulos de dominio para que Fuentes, Diccionario, Parámetros y Dashboard no dependan directamente de hooks de Clerk. Ante `401`, la interfaz llevará al inicio de sesión. El manejo defensivo existente de `403` puede permanecer para respuestas ajenas a esta política, pero la autenticación ya no lo utilizará para diferenciar usuarios de una misma instancia.

**Alternativas consideradas:** pasar el token manualmente en cada servicio haría visible la autenticación en toda la aplicación y facilitaría omisiones. Usar cookies propias requeriría un backend de sesión adicional y gestión CSRF.

### 4. Autorizar los routers administrativos y publicar el router del dashboard

El backend incorporará el SDK oficial de Clerk para Python y una dependencia `require_admin`. La dependencia utilizará un esquema HTTP Bearer no automático, validará el token con la clave JWT de Clerk y verificará vigencia, emisor, `azp` contra `CLERK_AUTHORIZED_PARTIES` y la presencia de `sub`. Superada esa validación, el sujeto se considerará administrador sin una lista adicional.

Los routers completamente administrativos se incluirán con la dependencia en el nivel del router. Las seis operaciones `GET` del router de dashboard —resumen, geografía, evolución, nube de palabras, noticias influyentes y desglose de términos— permanecerán sin dependencia de autorización. Swagger y OpenAPI quedan fuera de `/api/v1` y continúan públicos.

Esta estructura permite que FastAPI refleje el esquema Bearer solo en las operaciones administrativas protegidas. El generador OpenAPI conservará la eliminación del `422` y añadirá descripciones reutilizables de `401` y `503` donde corresponda; ninguna operación del dashboard declarará ese esquema ni esas respuestas.

**Alternativas consideradas:** un middleware global con lista de excepciones reduce cambios en routers, pero una coincidencia incorrecta de prefijos podría publicar accidentalmente una operación administrativa. Declarar la dependencia por router mantiene protegidas Fuentes, Diccionario, Parámetros y las operaciones internas, mientras el router analítico conserva una frontera pública explícita. No se hará público todo `GET`, porque el método HTTP no determina si un recurso pertenece a administración.

### 5. Separar errores de autenticación y operación

La dependencia responderá:

- `401` y encabezado `WWW-Authenticate: Bearer` cuando falte el token, falle su validación o provenga de otra instancia.
- `503` cuando falte configuración obligatoria o el verificador no pueda operar por una condición interna; el detalle no expondrá claves ni tokens.

La validación completa de la sesión se ejecutará antes de cualquier servicio, repositorio o mutación. Los handlers existentes de `400`, `404`, `403` de dominio si alguno lo requiere y `500` continuarán aplicándose después de autorizar.

**Alternativas consideradas:** conservar un `403` para usuarios válidos exigiría mantener una fuente adicional de permisos. Como la instancia es exclusiva para administración, una sesión válida ya representa la autorización; los tokens de otra instancia fallan la verificación y reciben `401`.

### 6. Configurar secretos fuera del repositorio y mantener la consulta pública

La raíz y Compose propagarán al backend `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` y `CLERK_AUTHORIZED_PARTIES`; el frontend recibirá solamente `VITE_CLERK_PUBLISHABLE_KEY`. Los `.env.example` documentarán nombres y formatos sin valores utilizables y no contendrán una lista de usuarios. `CLERK_AUTHORIZED_PARTIES` aceptará una lista separada por comas; localhost usará `http://localhost:5173` y producción su origen HTTPS.

Los ajustes del backend se validarán de manera diferida al entrar en una operación protegida, no como requisito para iniciar FastAPI, de modo que los endpoints públicos sigan disponibles. En el frontend, la ausencia o falla de la configuración Clerk impedirá el acceso administrativo, pero no el montaje de `/dashboard`. La configuración inválida nunca desactivará la dependencia ni concederá acceso por defecto.

**Alternativas consideradas:** fallar el proceso completo durante el arranque detecta antes una configuración ausente, pero también derriba el landing y el dashboard públicos y contradice el aislamiento requerido. Usar claves de producción en localhost mezclaría usuarios, telemetría y permisos, además de aumentar el impacto de una filtración.

### 7. Probar sin depender de servicios Clerk reales

Las pruebas del backend reemplazarán el verificador Clerk por dobles controlados y comprobarán la dependencia tanto de forma aislada como a través de operaciones públicas y protegidas. Las seis consultas del dashboard se verificarán sin token; para las operaciones administrativas se cubrirán token ausente, inválido/expirado, emisor u origen incorrecto, varios sujetos válidos de la instancia y configuración incompleta. También se verificará el documento OpenAPI sin una respuesta administrativa `403` basada en pertenencia a una lista.

Las pruebas del frontend usarán un proveedor Clerk simulado para verificar el dashboard sin sesión, durante la carga y ante una falla de Clerk; la ampliación de la navegación con sesión; el retorno predeterminado a `/dashboard`; la conservación de rutas administrativas solicitadas directamente; la inclusión del Bearer solo en módulos protegidos; la representación de `403`; y el cierre de sesión hacia la presentación pública. La validación manual final utilizará la instancia Development y las cuentas creadas para localhost.

**Alternativas consideradas:** ejecutar toda la suite contra Clerk haría las pruebas más lentas, dependientes de red y de secretos. Se reservará una comprobación real para la validación de despliegue, no para las pruebas deterministas habituales.

## Risks / Trade-offs

- [Una cuenta adicional creada por error en Clerk obtiene acceso administrativo] → Mantener la instancia dedicada, el registro público deshabilitado y la creación o eliminación de usuarios limitada a operadores autorizados en Clerk; tratar la gestión de usuarios de esa instancia como la gestión de administradores de HumWorld.
- [Una ruta nueva bajo `/api/v1` puede quedar pública si se olvida la dependencia] → Incluir routers administrativos con dependencia por defecto, mantener una prueba que enumere operaciones sin seguridad y permitir únicamente las seis consultas analíticas declaradas.
- [Una clave JWT rotada puede invalidar la verificación local] → Documentar la actualización coordinada de `CLERK_JWT_KEY` y validar una sesión real después de rotar; no degradar a acceso sin verificación.
- [La primera implantación puede bloquear al administrador por claves de instancia o `azp` incorrectos] → Probar en local dos cuentas Development y entregar al encargado las claves y orígenes Production correspondientes, sin identificadores de usuario.
- [El frontend y backend desplegados en momentos distintos pueden ser temporalmente incompatibles] → Desplegar primero el backend para publicar las seis consultas y después el frontend, evitando que el dashboard anónimo reciba `401` durante la transición.
- [Mantener seis endpoints públicos permite consultas fuera de la interfaz] → Se acepta conscientemente porque son datos analíticos de consulta y no modifican parámetros; permanecen vigentes la validación de entradas y los límites actuales de respuesta.
- [Sin MFA, la contraseña es el único factor] → Usar contraseñas únicas y robustas para las cuentas de la instancia restringida, conservar recuperación por correo y controlar estrictamente su creación; MFA queda explícitamente fuera del alcance solicitado.
- [Una transición entre dashboard y administración puede dejar instalada o ausente la función de token] → Acotar la frontera Bearer al subárbol administrativo, limpiarla al salir y probar bajo `StrictMode` que toda solicitud administrativa lleve token desde el primer intento.
- [Clerk puede quedar cargando o fallar mientras se abre el dashboard] → Renderizar contenido y navegación pública por defecto; la sesión solo enriquece el shell después de resolverse y cualquier error degrada a la presentación pública.
- [El compromiso de cualquier cuenta de la instancia concede administración] → Mantener pocas cuentas, contraseñas robustas, recuperación controlada y baja inmediata del usuario en Clerk; introducir roles solo si la instancia deja de ser exclusiva para administradores.

## Migration Plan

1. Crear y configurar las instancias Clerk Development y Production con correo/contraseña, recuperación y acceso restringido; crear manualmente las cuentas necesarias y mantener deshabilitado el registro público.
2. Configurar y validar localmente dos cuentas Development sin registrar sus identificadores en HumWorld. Preparar para el encargado de despliegue las variables Production, su formato y dónde obtener las claves y el origen de la instancia productiva.
3. Retirar la autorización de geografía, evolución y desglose de términos; confirmar que Swagger presenta las seis consultas analíticas sin Bearer y que los routers administrativos siguen protegidos.
4. Separar la presentación del shell de la integración Clerk, mover `/dashboard` fuera del guard y añadir la detección opcional de sesión; validar que el dashboard anónimo conserva exactamente su contenido y lenguaje visual.
5. Ajustar el retorno del inicio y cierre de sesión a `/dashboard`, conservar destinos administrativos directos y verificar que el token se configure únicamente al entrar en el subárbol protegido.
6. Retirar `CLERK_ADMIN_USER_IDS` de la configuración, Compose, plantillas y documentación; levantar el stack local y ejecutar pruebas automatizadas y sesiones reales de extremo a extremo, incluyendo el fallback público sin Clerk.
7. Entregar al encargado de despliegue la configuración Production necesaria, sin identificadores de usuario, para que la cargue en su proveedor. La carga y las pruebas de Production son responsabilidad del encargado y quedan fuera de la validación local de este cambio.
8. Ante un fallo local, mantener el dashboard en su presentación pública, corregir la configuración Development antes de entregar los valores y retirar o rotar los secretos si se sospecha exposición.
