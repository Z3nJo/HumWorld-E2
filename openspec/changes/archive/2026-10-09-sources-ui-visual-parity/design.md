# Design

## Context

La pantalla de Fuentes y canales RSS (`/fuentes`) existe con funcionalidad completa. La implementación usa React + TypeScript en arquitectura domain/application/presentation. Los archivos clave son `SourcesPage.tsx`, `SourceTable.tsx`, `SourceDrawer.tsx` y `SourcesPage.css`. El hook `useSources` gestiona estado y llamadas a la API. El toggle por feed individual ya funciona vía `PATCH /api/v1/sources/{id}`. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**
- Alinear nomenclatura ("Canal / Canales RSS") con el prototipo HTML en toda la UI
- Habilitar toggle de activación a nivel de grupo de canales reutilizando el PATCH existente
- Añadir visualmente el campo "URL del sitio" en la tabla y el drawer (disabled + REQUIERE BACK)
- No introducir nuevas dependencias ni cambios de contrato de API

**Non-Goals:**
- Exponer `site_url` o `country` desde el backend
- Migrar la arquitectura del componente
- Cambios en otras pantallas (Diccionario, Parámetros, Operaciones)

## Decisions

### D1 — Toggle de grupo: iterar sobre feeds con el PATCH existente

**Decisión**: Al activar/desactivar el toggle del canal-grupo, llamar `PATCH /api/v1/sources/{id}` secuencialmente para cada feed del grupo.

**Alternativas descartadas**:
- Añadir un endpoint `PATCH /api/v1/channels/{id}` que propague la activación → requiere cambio de backend, fuera de alcance.
- Llamadas en paralelo (`Promise.all`) → mayor riesgo de race conditions con el estado local optimista.

**Rationale**: La solución reutiliza código ya probado (`toggleSourceActive`) sin cambios de contrato. La serialización es aceptable dado que los grupos tienen pocos feeds (≤5 en el conjunto de datos actual).

### D2 — Estado visual del toggle de grupo: "activo si alguno está activo"

**Decisión**: El toggle del canal-grupo muestra `on` si al menos uno de sus feeds está activo; `off` si todos están inactivos.

**Rationale**: Coincide con la semántica del prototipo y evita ambigüedad cuando feeds de un mismo grupo tienen estados mixtos.

### D3 — Campo "URL del sitio": visual con REQUIERE BACK, sin campo en el modelo

**Decisión**: Mostrar el campo en la tabla (fila padre) y en el drawer como texto disabled con badge `REQUIERE BACK`. No añadir `siteUrl` al tipo `Source` ni enviarlo en ninguna petición.

**Rationale**: El backend no expone ni persiste este campo. Añadir un campo ficticio al modelo TypeScript generaría deuda técnica y podría confundir a futuros desarrolladores.

### D4 — Acciones de edición y eliminación exclusivas en la fila padre

**Decisión**: Remover los botones «Editar» y «Eliminar» de la sub-tabla de canales RSS individuales, manteniéndolos únicamente en la cabecera del canal-grupo/fuente con estado deshabilitado (`REQUIERE BACK`).

**Rationale**: Se ajusta a la estructura del prototipo donde la entidad administrada globalmente es la fuente principal, evitando redundancia en la sub-tabla.

### D5 — Estado inicial colapsado sin reapertura forzada

**Decisión**: Inicializar `openChannelIds` como un conjunto vacío `Set()` sin forzar la apertura de `data[0].channelId` al recibir datos del backend.

**Rationale**: Corrige el bug donde canales como Africanews permanecían desplegados por defecto de manera inconsistente y permite al usuario controlar la expansión.

## Risks / Trade-offs

- **[Riesgo] Múltiples PATCH secuenciales pueden tardar si el grupo tiene muchos feeds** → Mitigación: mostrar estado de carga en el toggle mientras las peticiones están en curso; recargar estado desde API tras error.
- **[Trade-off] El campo "URL del sitio" queda sin dato real** → Aceptado; la paridad visual es el objetivo de este change, el dato vendrá en un change posterior de backend.

## Open Questions

- ¿El botón "Editar" de la fila padre (canal-grupo) debe redirigir a editar el primer feed del grupo o abrir un drawer de edición del canal? → Actualmente está deshabilitado con REQUIERE BACK; se mantiene así hasta que el backend exponga un endpoint de edición de canal.
