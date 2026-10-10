# Proposal

## Why

La pantalla de Fuentes y canales RSS tiene una implementación funcional pero presenta divergencias visuales y de nomenclatura respecto al prototipo `HumWorld Prototipo.html`. Esto dificulta la validación con stakeholders, que esperan una correspondencia fiel con el HTML de referencia antes de avanzar en implementación de backend.

## What Changes

- **Nomenclatura**: Renombrar "Feed" → "Canal" y "Feeds RSS asociados" → "Canales RSS" en toda la pantalla y el drawer, alineando con el vocabulario del prototipo.
- **URL del sitio en la tabla**: La columna de la fuente (fila padre) mostrará la URL del sitio bajo el nombre. Dado que el backend no expone `site_url`, se mostrará disabled con badge `REQUIERE BACK`.
- **Toggle "Activa" de la fila padre**: Actualmente deshabilitado. El backend sí soporta `PATCH /api/v1/sources/{id}` con `active`; se conecta el toggle aplicando el cambio a todos los feeds del grupo (activa/desactiva el canal en bloque). Si todos están inactivos → canal inactivo; si alguno activo → canal activo.
- **Toggle "Activo" en sub-tabla de feeds**: Ya funciona. Se mantiene.
- **Columna "País" en sub-tabla**: Permanece disabled + `REQUIERE BACK` (el backend no expone `country`).
- **Campo "URL del sitio" en el drawer de creación/edición**: Se añade el campo visual tal como aparece en el prototipo; disabled + `REQUIERE BACK` ya que el backend no persiste ese campo.
- **Formulario "Nueva fuente"**: Sección "Canales RSS" (antes "Feeds RSS asociados"), etiqueta "Canal N" (antes "Feed #N"), campo "URL del sitio" visual con badge.

## Capabilities

### New Capabilities

_(Ninguna — todo pertenece a la capacidad existente `frontend/sources-ui`.)_

### Modified Capabilities

- `frontend/sources-ui`: Paridad visual con el prototipo HTML — nomenclatura "Canal/Canales RSS", toggle de activación por grupo, campo URL del sitio (visual, REQUIERE BACK) y campo País (visual, REQUIERE BACK).

## Impact

- **Archivos front modificados**: `SourcesPage.tsx`, `SourceTable.tsx`, `SourceDrawer.tsx`, `SourcesPage.css`
- **API backend**: Sin cambios de contrato. El toggle del grupo reutiliza `PATCH /api/v1/sources/{id}` existente, llamándolo para cada feed del grupo.
- **Backend pendiente** (fuera de alcance de este change): exponer `site_url` y `country` en el modelo `Source` para eliminar los badges `REQUIERE BACK` correspondientes.
