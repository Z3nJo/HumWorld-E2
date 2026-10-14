# Proposal

## Why

La página de fuentes y canales del frontend debe reproducir exactamente todos los elementos visuales de `HumWorld Prototipo.html` y, al mismo tiempo, usar los contratos REST que ya existen. Cuando una capacidad visual no tenga soporte backend, debe permanecer visible pero bloqueada, siguiendo el patrón de la ruta de Parámetros.

## What Changes

- Ajustar la pantalla de fuentes y canales para igualar la jerarquía, layout, colores, tipografía, espaciado, tablas, filtros, drawer, modal y estados del HTML de referencia.
- Corregir los textos visibles y la codificación de caracteres en español.
- Mantener la integración del frontend con `GET`, `POST`, `PUT`, `PATCH` y `DELETE /api/v1/sources`.
- Adaptar el mapeo visual para presentar correctamente fuentes RSS agrupadas por canal usando la respuesta real de la API.
- Mantener filtros por continente y estado, expansión de canales, alta de fuentes, edición, activación/desactivación, eliminación, carga, errores y notificaciones.
- No modificar código, contratos, modelos, migraciones ni endpoints del backend.
- Mantener visibles los elementos del prototipo que dependan de backend ausente, pero mostrarlos bloqueados y acompañados por el texto `REQUIERE BACK`.
- No ejecutar peticiones, cambios optimistas ni persistencia simulada desde controles bloqueados.

## Capabilities

### New Capabilities

- `frontend/sources-ui`: Pantalla de administración de fuentes y canales RSS fiel al prototipo e integrada con los endpoints existentes de fuentes.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend: `frontend/src/pages/Sources/`, `frontend/src/features/sources/` y estilos/componentes compartidos únicamente cuando sea necesario.
- API consumida: `/api/v1/sources` y sus operaciones existentes; no se cambia el contrato.
- Backend pendiente: el API no expone gestión independiente, estado propio ni país de canales; esos elementos se conservarán visualmente bloqueados con `REQUIERE BACK`, sin cambios backend.
- Verificación: comparación visual con `C:\Users\M\Downloads\HumWorld Prototipo.html`, pruebas del frontend, lint, build e inspección de que no se modifique `backend/`.
