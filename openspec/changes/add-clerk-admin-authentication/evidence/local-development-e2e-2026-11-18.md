# Evidencia E2E sanitizada — Clerk Development

- Fecha: 2026-11-18
- Ambiente: Development local
- Origen del frontend: `http://localhost:5173`
- Cuenta utilizada: administrador configurado para el ambiente (identidad omitida)
- Datos excluidos: correo, contraseña, tokens y claves

## Acceso anónimo

- El landing `/` cargó sin sesión.
- Swagger `/api/docs` y OpenAPI `/api/openapi.json` respondieron `200`.
- Los tres endpoints públicos del landing respondieron `200` con un rango válido.
- `GET /api/v1/dashboards/geografia` respondió `401` sin sesión.
- La navegación anónima a `/dashboard` redirigió a `/sign-in`.

## Sesión administrativa real

- Clerk Development aceptó el inicio de sesión mediante correo y contraseña.
- La aplicación retornó a `/dashboard` después de autenticar.
- El shell mostró la identidad activa y la acción de cierre de sesión.
- El formulario final de inicio se mostró en español, con correo y contraseña simultáneos, sin registro ni proveedores sociales.
- Las cuatro pantallas protegidas cargaron correctamente:
  - `/dashboard`
  - `/fuentes`
  - `/dictionary`
  - `/parametros`
- Los registros sanitizados del backend confirmaron respuestas `200` para operaciones protegidas de dashboard, fuentes, canales, diccionario y configuración tras navegar con la implementación corregida.
- En la verificación final se observaron 28 respuestas `200` y ninguna `401` ni `403` en las solicitudes protegidas revisadas.
- La prueba de regresión automatizada navegó las cuatro rutas bajo `StrictMode`; todas las primeras solicitudes incluyeron Bearer y no cerraron la sesión.

## Cierre de sesión

- La acción **Cerrar sesión** terminó la sesión y volvió a `/`.
- Un acceso posterior a `/dashboard` redirigió nuevamente a `/sign-in`.

## Compatibilidad del SDK

- El frontend utilizó `@clerk/react` `6.19.0`.
- El formulario no mostró registro público ni proveedores sociales.
- Las 238 pruebas del frontend, lint y build finalizaron correctamente antes de la prueba E2E.
