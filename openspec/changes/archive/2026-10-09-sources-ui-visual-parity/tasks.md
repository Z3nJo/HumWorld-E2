# Tasks

## 1. Nomenclatura — Renombrar "Feed/Feeds" → "Canal/Canales RSS"

- [x] 1.1 En `SourceDrawer.tsx`: renombrar la sección "Feeds RSS asociados" → "Canales RSS", las etiquetas "Feed #N" → "Canal N", y el botón "+ Añadir feed" → "+ Añadir canal". Verificar visualmente en la UI que el drawer muestra la nueva nomenclatura tanto en creación como en edición.
- [x] 1.2 En `SourceTable.tsx`: renombrar la cabecera de la sub-tabla "URL del feed RSS" → "URL del canal RSS" y ajustar cualquier `aria-label` que mencione "feed". Verificar que la sub-tabla expandida muestra la cabecera actualizada.
- [x] 1.3 En `SourcesPage.tsx`: actualizar el contador de resumen `canal(es)` en lugar de `feed(s)` y ajustar cualquier texto visible de interfaz que mencione "feed". Verificar el contador en la barra de filtros.

## 2. Campo "URL del sitio" — Visual con REQUIERE BACK

- [x] 2.1 En `SourceTable.tsx` (fila padre): reemplazar el texto placeholder "URL del sitio · [badge]" por el diseño del prototipo: `<div class="meta"><URL_PLACEHOLDER> <badge>REQUIERE BACK</badge></div>`. Mostrar un guión `—` como valor ya que el dato no está disponible. Verificar que la fila padre muestra el campo alineado al prototipo HTML con badge visible.
- [x] 2.2 En `SourceDrawer.tsx` (formulario de creación): añadir el campo `<label>URL del sitio<input disabled placeholder="https://" /></label>` justo debajo del campo "Nombre del medio / canal", con badge `REQUIERE BACK` y clase `backend-help`. Verificar que el campo aparece deshabilitado con el badge en el drawer de creación.
- [x] 2.3 En `SourceDrawer.tsx` (formulario de edición): añadir el mismo campo "URL del sitio" disabled con badge, también debajo del nombre del canal. Verificar que aparece en el drawer de edición.

## 3. Toggle "Activa" del canal-grupo — Funcional

- [x] 3.1 En `source.ts` (dominio): añadir un campo calculado o derivar el estado agregado del grupo: `isActive: boolean` en `ChannelGroup`, definido como `true` si al menos un feed del grupo está activo. Verificar que el tipo compila sin errores.
- [x] 3.2 En `useSources.ts` (application): implementar la función `toggleGroupActive(groupId: number)` que llama secuencialmente `PATCH /api/v1/sources/{id}` con `{ active: !group.isActive }` para cada feed del grupo, y recarga el estado tras completar o ante cualquier error. Verificar con un mock que la función itera sobre todos los feeds del grupo.
- [x] 3.3 En `SourceTable.tsx`: reemplazar el toggle deshabilitado de la fila padre por un toggle funcional que llame `onToggleGroupActive(group.id)`. Estado visual: `on` si `group.isActive`, `off` en caso contrario. Añadir `aria-label` descriptivo. Verificar que el toggle cambia de estado y los feeds del grupo reflejan el cambio.
- [x] 3.4 En `SourcesPage.tsx`: exponer `toggleGroupActive` desde `useSources` y pasarlo como prop `onToggleGroupActive` a `SourceTable`. Verificar que al activar/desactivar el toggle del grupo se muestra un toast de confirmación y los feeds hijos cambian de estado.
- [x] 3.5 Actualizar el test existente de `useSources.test.ts` para cubrir el caso `toggleGroupActive` (éxito y error). Verificar que `npm test` pasa sin errores.

## 4. Verificación integral

- [x] 4.1 Con el servidor de desarrollo en marcha (`npm run dev`), navegar a `/fuentes` y verificar que: la nomenclatura es "Canal/Canales RSS" en toda la pantalla; la fila padre muestra "URL del sitio — REQUIERE BACK"; el toggle del canal-grupo activa/desactiva todos sus feeds; el drawer de creación incluye el campo "URL del sitio" disabled.
- [x] 4.2 Verificar que los tests existentes de `SourcesPage.test.tsx` siguen pasando tras los cambios de nomenclatura y que los nuevos textos están cubiertos. Ejecutar `npm test` y confirmar que no hay fallos.

## 5. Ajustes de paridad de acciones y bugfix de despliegue

- [x] 5.1 En `SourceTable.tsx`: eliminar los botones "Editar" y "Eliminar" de las filas de la sub-tabla de canales RSS, manteniendo únicamente los botones de la fila padre con `REQUIERE BACK`.
- [x] 5.2 En `useSources.ts`: eliminar la apertura forzada automática del primer canal (`setOpenChannelIds`) para que todas las fuentes inicien colapsadas por defecto, resolviendo el bug de Africanews.
- [x] 5.3 Actualizar tests de `SourcesPage.test.tsx` y `useSources.test.ts` para verificar que la sub-tabla no contiene botones de edición/eliminación y que el estado inicial está colapsado. Ejecutar `npm test` para validar.

## Workflow follow-up

- Archivar el change una vez que los cambios estén revisados y aprobados.
- Abrir un issue de backend para añadir `site_url` y `country` al modelo `Source`/`Channel` y eliminar los badges `REQUIERE BACK` correspondientes en un change futuro.
