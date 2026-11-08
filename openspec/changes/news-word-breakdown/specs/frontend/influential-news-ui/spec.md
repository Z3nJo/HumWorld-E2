## ADDED Requirements

### Requirement: Desglose de palabras en panel lateral
El detalle de cada noticia influyente SHALL incluir el botón "Ver desglose de palabras". Al activarlo, la interfaz SHALL abrir un único panel lateral (`<dialog>` modal) que consulte `GET /api/v1/dashboards/noticias/{id}/terminos` y muestre el titular, el `valor_humor` guardado y una tabla `Palabra | Valor | Veces | Aporte` en el orden recibido. El panel SHALL indicar que el aporte está en escala de términos y no en [-1, 1].

#### Scenario: No consultar al renderizar la lista
- **WHEN** se renderiza la lista de noticias influyentes
- **THEN** no se solicita ningún desglose

#### Scenario: Abrir el panel
- **WHEN** el usuario activa "Ver desglose de palabras"
- **THEN** se abre el panel y se solicita el desglose una sola vez por apertura

#### Scenario: Cerrar el panel
- **WHEN** el usuario pulsa el botón de cierre o presiona Escape
- **THEN** el panel se cierra

#### Scenario: Signo visible
- **WHEN** la tabla muestra `Valor` y `Aporte`
- **THEN** cada cifra lleva signo explícito (`+`, `−` o `±`) como texto, sin depender solo del color

#### Scenario: Error con reintento
- **WHEN** la consulta del desglose falla
- **THEN** el panel muestra el error y permite reintentar
