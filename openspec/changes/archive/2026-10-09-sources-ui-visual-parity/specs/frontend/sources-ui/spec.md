# Spec Delta

## MODIFIED Requirements

### Requirement: Renderizar todos los elementos visuales del prototipo

La interfaz SHALL conservar todos los elementos visuales, controles, columnas, estados, etiquetas, tabla, drawer y componentes superpuestos definidos por `HumWorld Prototipo.html`, aunque alguna capacidad no esté soportada por el backend.

La nomenclatura SHALL ser idéntica al prototipo: los términos "Canal" y "Canales RSS" reemplazan a "Feed" y "Feeds RSS" en toda la interfaz visible.

#### Scenario: Vista cargada con datos

- **WHEN** la consulta de fuentes finaliza correctamente
- **THEN** se muestran el encabezado, filtros, contador, tabla agrupada por canal y acciones con el estilo del prototipo
- **AND** los textos visibles en español se muestran correctamente codificados
- **AND** los elementos sin soporte backend conservan su apariencia y se muestran bloqueados con `REQUIERE BACK`
- **AND** la interfaz usa el término "Canal" y "Canales RSS" en lugar de "Feed" y "Feeds RSS"

#### Scenario: Vista sin resultados

- **WHEN** los filtros no producen fuentes
- **THEN** la pantalla muestra el estado vacío del prototipo y conserva los filtros y la acción de crear

### Requirement: Gestionar fuentes RSS con operaciones persistentes

La interfaz SHALL permitir crear, editar, activar o desactivar y eliminar fuentes usando únicamente `POST`, `PUT`, `PATCH` y `DELETE /api/v1/sources`.

El drawer de creación de fuente SHALL mostrar el campo "URL del sitio" del medio tal como aparece en el prototipo; dado que el backend no expone ni persiste `site_url`, el campo SHALL estar deshabilitado y marcado con `REQUIERE BACK`.

#### Scenario: Crear una fuente con uno o más canales

- **WHEN** el usuario completa datos válidos de canal y URLs RSS y confirma
- **THEN** se envía una solicitud compatible con `POST /api/v1/sources`
- **AND** la respuesta exitosa actualiza la lista y muestra confirmación

#### Scenario: Editar o cambiar el estado de una fuente

- **WHEN** el usuario guarda cambios válidos o cambia el interruptor de actividad
- **THEN** se envía `PUT` o `PATCH` para la fuente correspondiente
- **AND** la interfaz refleja la respuesta persistida de la API

#### Scenario: Eliminar una fuente

- **WHEN** el usuario confirma la eliminación
- **THEN** se envía `DELETE /api/v1/sources/{source_id}`
- **AND** la fuente se retira de la lista solo después de una respuesta exitosa

## ADDED Requirements

### Requirement: Activar o desactivar un canal en bloque desde la fila principal

La interfaz SHALL mostrar un toggle funcional en la columna "Activa" de cada fila de canal (grupo). Al accionarlo, SHALL enviar `PATCH /api/v1/sources/{id}` con `active: true/false` para cada feed individual del grupo de forma secuencial. El estado visual del toggle SHALL reflejar si alguno de los feeds del grupo está activo.

#### Scenario: Activar un canal con todos sus feeds inactivos

- **WHEN** el usuario activa el toggle del canal cuyo grupo tiene todos los feeds inactivos
- **THEN** se envían peticiones `PATCH` con `active: true` para cada feed del grupo
- **AND** tras las respuestas exitosas el toggle se muestra en estado activo

#### Scenario: Desactivar un canal activo

- **WHEN** el usuario desactiva el toggle del canal cuyo grupo tiene al menos un feed activo
- **THEN** se envían peticiones `PATCH` con `active: false` para cada feed del grupo
- **AND** tras las respuestas exitosas el toggle se muestra en estado inactivo

#### Scenario: Error al cambiar estado del canal en bloque

- **WHEN** alguna de las peticiones PATCH falla durante el cambio en bloque
- **THEN** se muestra un mensaje de error y se recarga el estado desde la API para reflejar el estado real

### Requirement: Acciones de edición y eliminación restringidas a nivel de fuente

La interfaz SHALL presentar los botones de acción «Editar» y «Eliminar» únicamente en la fila padre (a nivel de fuente), deshabilitados con la indicación `REQUIERE BACK`. Las filas hijas de la sub-tabla de canales RSS SHALL NO incluir botones de editar ni eliminar individuales, conservando únicamente el interruptor funcional de activación/desactivación.

#### Scenario: Sub-tabla sin botones de editar ni eliminar

- **WHEN** el usuario despliega una fuente
- **THEN** la sub-tabla muestra las columnas URL del canal RSS, Categoría IPTC, País y Activo
- **AND** no se muestran botones de acción «Editar» ni «Eliminar» en las filas de la sub-tabla

### Requirement: Comportamiento de despliegue de fuentes

La interfaz SHALL iniciar con todas las filas de fuentes colapsadas por defecto, permitiendo al usuario expandir y colapsar cualquier elemento sin reapertura automática.

#### Scenario: Estado inicial colapsado

- **WHEN** la vista de fuentes carga los datos
- **THEN** todas las filas de canales/fuentes inician colapsadas
- **AND** el usuario puede alternar la visibilidad individual de cada una con el botón de despliegue
