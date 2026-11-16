## Decisiones

- **Endpoint aparte:** `paises_atribuidos` es el único campo aditivo del ranking; además evita cargar términos de 10 noticias que nadie abre.
- **`valor` = `aporte_humor / ocurrencias`**, no `termino.valor`: el diccionario puede editarse después del análisis y los números dejarían de cerrar.
- **Sin filtrar por `termino.activo`:** un término desactivado después igual aportó a esa noticia.
- **Sin recalcular el humor en pantalla:** la fórmula es configurable y `promedio_simple` ignora las ocurrencias. Se muestra el `valor_humor` guardado, con una nota de que el aporte está en escala de términos y no en [-1, 1].
- **Orden:** `ABS(aporte_humor)` descendente y `palabra` ascendente.
- **Panel lateral con `<dialog>` nativo y `showModal()`:** foco contenido, cierre con Escape y devolución del foco sin código propio. `.influential-news` no tiene alto fijo, así que una tabla dentro de la tarjeta empujaría a las noticias siguientes.
- **Sin `SourceDrawer`:** es un formulario, no gestiona el foco y sus estilos viven en `pages/Sources/SourcesPage.css`.
- **Contrato de atribución:** la regla "no se agregan rutas destinadas al frontend" pertenece al cambio de atribución por país; este cambio agrega una ruta nueva a propósito y no altera las existentes.
