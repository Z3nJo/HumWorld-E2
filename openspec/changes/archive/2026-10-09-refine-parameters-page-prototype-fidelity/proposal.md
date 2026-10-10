# Proposal

## Why

La pantalla de parámetros existente no reproduce completamente la página de referencia `HumWorld Prototipo.html`: falta la tarjeta del parámetro de agregación de humor, existen textos con codificación incorrecta y la estructura visual no refleja todos los estados del prototipo. Se necesita una refinación exclusiva del frontend que conserve la integración disponible con `/api/v1/config` sin modificar el backend.

## What Changes

- Ajustar `/parametros` para igualar la jerarquía visual, tarjetas, espaciado, controles, estados y textos del prototipo.
- Corregir todos los textos visibles afectados por problemas de codificación.
- Mantener lectura y guardado de los dos parámetros soportados actualmente mediante `GET/PUT /api/v1/config`.
- Mostrar el parámetro `humor.minimo_noticias_agregacion` como no editable/no disponible cuando el backend no lo exponga, explicando la limitación en la interfaz sin inventar persistencia local.
- Mantener validación de enteros positivos, estado de cambios sin guardar, descarte, guardado, carga, errores y notificaciones.
- No modificar código, contratos, modelos, migraciones ni endpoints del backend.

## Capabilities

### New Capabilities

- `frontend/parameters-ui`: Interfaz de parámetros generales fiel al prototipo, integrada con los endpoints de configuración existentes y con tratamiento explícito de parámetros que el backend aún no expone.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend: `frontend/src/pages/Parameters/`, `frontend/src/features/config/` y estilos/componentes compartidos únicamente cuando sea necesario para la pantalla.
- API consumida: `GET /api/v1/config` y `PUT /api/v1/config`, sin cambios de contrato.
- Backend: fuera de alcance; el soporte API para `humor.minimo_noticias_agregacion` se documentará como pendiente si continúa ausente.
- Verificación: comparación visual con `C:\Users\M\Downloads\HumWorld Prototipo.html`, pruebas del frontend y comprobación de integración con la API existente.
