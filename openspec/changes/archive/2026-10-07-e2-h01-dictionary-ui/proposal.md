# Proposal

## Why

El backend de gestión de diccionario (E2-H01-API) ya expone el contrato REST completo para crear, listar, buscar, editar y eliminar términos, pero no existe ninguna interfaz de usuario. Los administradores deben operar directamente sobre la API sin ninguna capa visual, lo que hace inviable el uso cotidiano. Esta pantalla cierra esa brecha y constituye la primera UI de la aplicación HumWorld.

## What Changes

- Se construye el layout base de la aplicación (sidebar de navegación oscuro + área de contenido) desde cero, ya que no existe ningún componente de shell.
- Se implementa la pantalla **Diccionario de términos** accesible en la ruta `/dictionary`, que permite:
  - **Crear** un término nuevo (palabra, idioma `es`/`en`, valor decimal) con formulario siempre visible en la parte superior.
  - **Listar** todos los términos filtrados por estado: activos (vista por defecto), inactivos o todos.
  - **Buscar** por coincidencia parcial de la palabra con debounce de 300 ms, con highlighting del texto buscado en la tabla.
  - **Editar** un término mediante fila inline expandible (sin modal), permitiendo modificar palabra, idioma y valor.
  - **Eliminar** un término (eliminación lógica vía DELETE → `activo=false`) con confirmación inline en la fila.
- Se implementa un sistema de notificaciones tipo toast para feedback inmediato tras cada operación CRUD.
- La UI refleja los cambios de inmediato mediante actualizaciones optimistas: el estado local se actualiza antes de confirmar la respuesta de la API; si la API falla, se revierte con toast de error.
- La barra visual de valor (positivo en azul, negativo en rojo) anima el progreso en tiempo real al editar.

## Capabilities

### New Capabilities

- `dictionary-ui`: Interfaz de gestión del diccionario de términos. Cubre la pantalla completa incluyendo formulario de creación, tabla de términos con filtros de estado, búsqueda, edición inline y eliminación con feedback visual.
- `app-shell`: Layout base de la aplicación: sidebar de navegación con secciones Análisis y Administración, área de contenido principal, y footer de referencia a API/contrato.

### Modified Capabilities

## Impact

- **Código nuevo**: `src/pages/Dictionary/`, `src/components/AppShell/`, `src/components/Toast/`, hook `useDictionary`, hook `useToast`.
- **Rutas**: Se introduce `react-router-dom` para el routing. La ruta `/` redirige a `/dictionary` por ahora.
- **API**: Consume `GET /api/v1/dictionary`, `POST /api/v1/dictionary`, `PATCH /api/v1/dictionary/{id}`, `DELETE /api/v1/dictionary/{id}`. La URL base se configura via variable de entorno `VITE_API_URL`.
- **Sin nuevas dependencias**: El stack existente (React 19, react-router-dom 7, Vite, Vanilla CSS) es suficiente.
- **CSS**: Se extiende `index.css` con tokens de color semánticos (rojo, azul, verde) y se añaden archivos CSS colocados junto a cada componente.
