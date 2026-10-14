# Proposal

## Why

La revisión de la integración de `feat/parametros-ui` identificó dos fallos funcionales y un punto de mantenimiento:
1. Un fallo en el guardado (`PUT /api/v1/config`) oculta el formulario bajo el mensaje "No se pudieron cargar los parámetros", provocando la pérdida del borrador y obligando a un reintento que ejecuta un `GET`, descartando los cambios pendientes.
2. Los campos numéricos utilizan `parseInt`, truncando entradas decimales (e.g. `1.5` se convierte en `1`) antes de la validación, impidiendo que `Number.isInteger` rechace valores decimales tal como exige la especificación.
3. Las clases globales compartidas en `ParametersPage.css` (`.btn`, `.inp`, `.top`, `.view`) acoplan los estilos con `DictionaryPage.css`, arriesgando inconsistencias según el orden de importación.

## What Changes

- Distinguir los estados de error de carga (`loadError`) y error de guardado (`saveError`) en `useConfig`.
- Mantener visible el formulario y conservar el borrador ante fallos del guardado (`PUT`), mostrando el mensaje de error de guardado y permitiendo reintentar la persistencia sin recargar datos del servidor.
- Preservar el valor numérico completo en los inputs de `ConfigCards` utilizando `valueAsNumber` para que la validación rechace explícitamente decimales y valores vacíos.
- Aislar los estilos de la página de parámetros mediante prefijos (`.params-top`, `.params-view`, `.params-btn`, `.params-inp`) para desacoplar el CSS de la pantalla de diccionario.
- Ampliar la cobertura de pruebas unitarias en `ParametersPage.test.tsx` cubriendo el fallo en `PUT` y el rechazo de entradas decimales.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `frontend/parameters-ui`: Actualización de los requisitos de gestión de errores y validación de campos numéricos en la interfaz de parámetros generales.

## Impact

- Frontend: `frontend/src/features/config/application/useConfig.ts`, `frontend/src/features/config/presentation/ConfigCards.tsx`, `frontend/src/pages/Parameters/ParametersPage.tsx`, `frontend/src/pages/Parameters/ParametersPage.css`, `frontend/src/pages/Parameters/ParametersPage.test.tsx`.
- APIs y contratos: Se mantiene el contrato estricto existente con `GET /api/v1/config` y `PUT /api/v1/config` sin cambios en el backend.
