## Context

Ver `proposal.md` (Why). Los endpoints ya existen y están especificados en `rss-news-capture` y `news-purging`; este change solo los consume. Restricciones relevantes:

- `POST /api/v1/sources/capture` es síncrono: la respuesta llega cuando termina la descarga y el análisis de todas las fuentes, por lo que puede tardar varios segundos.
- `DELETE /api/v1/news` responde `204` sin cuerpo: el cliente no puede saber cuántas noticias se eliminaron. `shared/api/httpClient.ts` ya devuelve `undefined` ante `204`.
- `useToast` solo admite los tipos `success` y `error`.
- La captura identifica canales RSS (`fuente_rss`), que en la UI son las subfilas de cada medio (ver Vocabulary Mapping de `frontend/sources-ui`).

## Goals / Non-Goals

**Goals:**
- Exponer ambas acciones manuales con el mínimo de piezas nuevas, reutilizando cliente HTTP, toasts, clases `.btn`/`.modal` y el patrón de modal de confirmación existente.

**Non-Goals:**
- Selección múltiple arbitraria de canales RSS para capturar (la API lo permite; la UI ofrece global y por medio).
- Mostrar el detalle por fuente del resultado de captura en una vista propia.
- Pantalla para `POST /api/v1/sentiment`.
- Cualquier cambio en el backend, como devolver la cantidad purgada.

## Decisions

1. **Captura en `/fuentes`, purgado en `/parametros`.** La captura actúa sobre fuentes, y la pantalla de fuentes ya tiene los identificadores necesarios. El purgado depende de `noticias_caducidad_dias`, que se edita en la tarjeta «Captura y caducidad». Alternativa descartada: una pantalla nueva de «Operaciones», que obliga a tocar el app-shell y la navegación para dos botones.

2. **Captura por medio, no por canal RSS.** La fila de medio ya tiene acciones (`Editar`, `Eliminar`), así que «Capturar» se agrega ahí con la misma clase `btn ghost sm`. Se envían solo los canales RSS activos del medio, para que la acción no dependa de que el backend los omita. Alternativa descartada: checkboxes por subfila, que agrega estado de selección que ninguna historia pide.

3. **Un único estado «captura en curso» por pantalla.** Mientras hay una petición pendiente, todas las acciones de captura se deshabilitan. Así se evitan capturas concurrentes del mismo feed sin coordinar varios estados.

4. **Cliente API dentro de las features existentes.** `captureSources(sourceIds?)` va en `features/sources/infrastructure/sourcesApi.ts`, con sus DTO en `sourcesDto.ts`. `purgeExpiredNews()` va junto a la API de configuración en `features/config/infrastructure`, porque solo la usa la pantalla de parámetros. Alternativa descartada: una feature `news` nueva con una sola función.

5. **Confirmación con el patrón de `DeleteSourceModal`.** El purgado es irreversible, así que se reutilizan la estructura, la tecla Escape y la prop `loading` en un modal propio de config. No se generaliza `DeleteSourceModal`, porque su texto y sus props son específicos de medios.

6. **Purgado bloqueado con cambios sin guardar.** El backend purga con la caducidad persistida. Si el usuario editó la caducidad sin guardar, el modal mostraría un valor distinto al que se aplica. Deshabilitar la acción elimina esa ambigüedad sin agregar lógica de guardado implícito.

## Risks / Trade-offs

- [Captura global lenta con muchas fuentes] → El botón queda en estado «Capturando…» y deshabilitado hasta la respuesta; no se agrega timeout propio.
- [El resumen de captura no se refleja en la tabla] → La tabla no muestra la fecha de última captura, así que no se recargan datos tras capturar; si en el futuro se muestra, recargar tras el `200`.
- [El toast del purgado no informa la cantidad] → Limitación aceptada del contrato `204`; cambiarla requiere un change de backend.
