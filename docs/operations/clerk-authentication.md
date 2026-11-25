# Autenticación administrativa con Clerk

HumWorld utiliza Clerk para autenticar las cuentas administrativas registradas en la
instancia dedicada de cada ambiente. El landing, Swagger y las tres consultas que
alimentan el landing continúan públicos; el resto del frontend y de `/api/v1`
requiere una sesión válida de esa instancia.

## 1. Separar Development y Production

Crear dos instancias de la aplicación en Clerk:

- **Development**: exclusivamente para `http://localhost:5173`.
- **Production**: exclusivamente para el dominio HTTPS productivo.

Las instancias tienen usuarios y claves independientes. Se puede usar el mismo correo
en ambas, pero no se deben copiar claves `sk_live_` al entorno local. HumWorld no
replica los `user_id`: pertenecer a la instancia del ambiente concede acceso
administrativo.

## 2. Configurar el método de acceso

En cada instancia, desde el panel de Clerk:

1. Habilitar dirección de correo y contraseña como método de inicio de sesión.
2. Mantener habilitada la recuperación de contraseña por correo.
3. Configurar el acceso como restringido o solo por invitación, según el nombre que
   muestre la versión del panel, y comprobar que no exista registro público.
4. Deshabilitar Google y cualquier otro proveedor social.
5. Deshabilitar MFA y TOTP.
6. En **Users**, crear manualmente las cuentas administrativas necesarias.
7. Revisar periódicamente esa lista y eliminar o suspender de inmediato cualquier
   cuenta que ya no deba administrar HumWorld.

La interfaz de HumWorld no contiene ruta ni enlace de registro. El backend acepta a
cualquier usuario con una sesión válida de la instancia configurada, por lo que crear
una cuenta en ella equivale a conceder acceso administrativo. No habilitar registro
público en esta instancia.

Clerk puede pedir por correo un código temporal al detectar un navegador nuevo
(Device Trust), incluso con MFA/TOTP desactivados. HumWorld admite ese desafío
automático y solo muestra el campo del código cuando Clerk lo solicita; no habilita
MFA configurable ni TOTP para las cuentas.

## 3. Obtener las claves

Desde **API Keys** de la instancia correspondiente, obtener:

- Publishable key (`pk_test_...` o `pk_live_...`).
- Secret key (`sk_test_...` o `sk_live_...`).
- JWT public key en formato PEM.

La clave pública PEM puede guardarse en `.env` en una sola línea, representando los
saltos con `\n`. No añadir comillas salvo que la herramienta de despliegue las
requiera expresamente.

## 4. Configurar localhost

Copiar `.env.example` a `.env` y completar, además de PostgreSQL:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REEMPLAZAR
CLERK_SECRET_KEY=sk_test_REEMPLAZAR
CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----\nREEMPLAZAR\n-----END PUBLIC KEY-----
CLERK_AUTHORIZED_PARTIES=http://localhost:5173
```

Los valores anteriores son marcadores y no son credenciales utilizables. Para más
de un origen permitido, separar valores con comas, sin rutas:

```dotenv
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,https://preview.example.com
```

Levantar el entorno desde la raíz:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml up --build
```

Comprobar:

1. `http://localhost:5173/` carga sin iniciar sesión.
2. `http://localhost:5173/dashboard` redirige a `/sign-in`.
3. La cuenta administrativa inicia sesión y vuelve al dashboard.
4. El shell muestra el correo y **Cerrar sesión** vuelve al landing.

## 5. Probar la API y Swagger

Swagger permanece en `http://localhost:3000/api/docs`. Las operaciones protegidas
muestran un candado y los códigos `401` y `503`; las tres operaciones públicas
no exigen Bearer:

- `GET /api/v1/dashboards`
- `GET /api/v1/dashboards/nube-palabras`
- `GET /api/v1/dashboards/noticias-influyentes`

Para una prueba local protegida, iniciar sesión en el frontend y obtener un token de
sesión temporal desde la consola del navegador:

```javascript
await window.Clerk.session.getToken()
```

Copiar únicamente el token temporal en **Authorize** de Swagger. No guardarlo en
archivos, capturas, logs ni evidencia. Sin token, con un token inválido o con una
sesión de otra instancia, una operación protegida responde `401`. Cualquier usuario
válido de la instancia configurada puede ejecutar la operación.

## 6. Configurar Production

Repetir el procedimiento con la instancia Production y entregar al encargado de
despliegue esta lista mediante el gestor de secretos del proveedor, nunca por el
repositorio, capturas, logs ni correo sin cifrar:

| Variable | Servicio | Formato Production | Origen en Clerk o despliegue |
| --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | `pk_live_...` | **API Keys → Publishable key** de la instancia Production |
| `CLERK_SECRET_KEY` | Backend | `sk_live_...` | **API Keys → Secret key** de la instancia Production |
| `CLERK_JWT_KEY` | Backend | PEM completo; usar `\n` si el proveedor exige una línea | **API Keys → JWT public key** de la instancia Production |
| `CLERK_AUTHORIZED_PARTIES` | Backend | Origen HTTPS exacto, sin ruta ni `/` final | Dominio público configurado por el proveedor de despliegue |

El encargado cargará esos valores directamente en el proveedor. Antes de publicar,
debe confirmar que el registro público continúa deshabilitado y probar el inicio de
sesión y el acceso protegido con las cuentas previstas de Production; una cuenta de
Development no es válida en ese ambiente. Agregar un usuario nuevo en Production no
requiere modificar variables ni redesplegar HumWorld. La carga y la verificación
productivas no requieren compartir acceso ni secretos con el repositorio.

Si se rota la JWT key o la secret key, actualizar ambos servicios coordinadamente y
verificar una operación protegida. Ante una configuración incompleta, las operaciones
protegidas fallan de forma cerrada con `503`, pero el landing y sus consultas públicas
continúan disponibles.
