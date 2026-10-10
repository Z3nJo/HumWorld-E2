# frontend/sources-ui Specification

## Purpose

Proporcionar una pantalla de administración de fuentes y canales RSS que reproduzca la experiencia visual del prototipo de HumWorld y permita gestionar las fuentes mediante el contrato REST existente, sin requerir cambios de backend.

## Requirements

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

### Requirement: Consultar y agrupar fuentes mediante la API existente

La interfaz SHALL consultar `GET /api/v1/sources` usando los filtros soportados y SHALL agrupar visualmente cada fuente RSS bajo su resumen de canal sin alterar el contrato del backend.

#### Scenario: Filtrar por continente y estado

- **WHEN** el usuario selecciona un continente o un estado
- **THEN** la lista visible contiene únicamente las fuentes que cumplen esos filtros
- **AND** la consulta utiliza los parámetros `continent` y `active` cuando corresponda

#### Scenario: Carga o consulta fallida

- **WHEN** la API no responde correctamente
- **THEN** la interfaz muestra un estado de error comprensible y una acción para reintentar

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

### Requirement: Bloquear capacidades visuales sin soporte backend

La interfaz SHALL conservar visibles las acciones, campos y estados del prototipo que no tengan un contrato backend equivalente, pero SHALL mostrarlos bloqueados, no editables y marcados con `REQUIERE BACK`.

#### Scenario: Acción o campo de canal sin endpoint equivalente

- **WHEN** el usuario encuentra una acción que implicaría modificar un canal como entidad independiente
- **THEN** el elemento permanece visible con el estilo del prototipo, pero bloqueado
- **AND** muestra el texto `REQUIERE BACK`
- **AND** no emite ninguna petición ni simula una persistencia local

#### Scenario: Estado visual no soportado

- **WHEN** el prototipo muestra una columna, interruptor o selector cuyo dato no existe en la respuesta de la API
- **THEN** se renderiza el control en estado disabled o no editable
- **AND** se explica que requiere soporte backend sin eliminar el elemento visual

### Requirement: Mantener estados de interacción y accesibilidad

La interfaz SHALL comunicar carga, guardado, validación, errores, confirmaciones, expansión de canales y cierre de drawer o modal mediante estados visibles y nombres accesibles.

#### Scenario: Formulario inválido

- **WHEN** falta un campo obligatorio o una URL RSS no es válida
- **THEN** se muestra el error junto al campo
- **AND** no se envía la solicitud

#### Scenario: Operación fallida

- **WHEN** una operación de creación, edición, activación o eliminación falla
- **THEN** se conserva el estado persistido anterior y se muestra el error de la API

