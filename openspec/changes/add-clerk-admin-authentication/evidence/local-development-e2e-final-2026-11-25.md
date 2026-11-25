# Evidencia E2E final sanitizada — Clerk Development

- Fecha: 2026-11-25
- Ambiente: Development local
- Origen del frontend: `http://localhost:5173`
- Alcance: dashboard público y acceso administrativo para cualquier usuario de la instancia Clerk restringida
- Confirmación: validación manual realizada por el usuario y comunicada durante la aplicación del cambio
- Datos excluidos: correos, contraseñas, tokens, claves e identificadores Clerk

## Acceso público

- `/dashboard` permaneció disponible sin sesión y mostró la navegación pública.
- El acceso administrativo se inició desde el dashboard sin cambiar su contenido analítico.
- Las seis consultas analíticas continuaron públicas y las operaciones administrativas permanecieron protegidas.

## Validación con dos cuentas Development

La comprobación se realizó con dos cuentas distintas registradas en la misma instancia Clerk Development y sin agregar sus identificadores al `.env`.

Para ambas cuentas se confirmó:

- inicio de sesión correcto mediante el acceso administrativo;
- retorno predeterminado a `/dashboard`;
- aparición de Fuentes y canales, Diccionario, Parámetros, cuenta activa y cierre de sesión;
- navegación correcta por `/dashboard`, `/fuentes`, `/dictionary` y `/parametros`;
- solicitudes administrativas autenticadas sin rechazo por una allowlist local;
- cierre de sesión con permanencia en `/dashboard` y recuperación de la navegación pública.

## Comprobaciones complementarias

- El contenedor backend no recibió `CLERK_ADMIN_USER_IDS`.
- OpenAPI no publicó `ClerkForbidden` ni una respuesta administrativa `403` basada en lista.
- La suite backend finalizó con 372 pruebas aprobadas y 1 omitida.
- La suite frontend finalizó con 251 pruebas aprobadas; lint y build también finalizaron correctamente.
- El contrato OpenAPI estático coincidió con el generado por la aplicación.

Esta evidencia no contiene material que permita identificar las cuentas o reutilizar sus sesiones.
