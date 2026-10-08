# dictionary-ui Specification

## Purpose

Interfaz visual para que los administradores de HumWorld puedan crear, listar, buscar, editar y eliminar términos del diccionario de sentimiento, reflejando los cambios de forma inmediata sin recargar la página.

## Requirements

### Requirement: Pantalla de listado con filtro de estado activo

La pantalla SHALL mostrar los términos del diccionario en una tabla ordenada alfabéticamente. El filtro de estado activo MUST ofrecer tres vistas seleccionables: solo activos, solo inactivos y todos. Al cambiar el filtro la tabla MUST actualizarse de inmediato sin recarga de página.

#### Scenario: Cargar la pantalla por primera vez
- **WHEN** el usuario navega a la pantalla del diccionario
- **THEN** la tabla muestra únicamente los términos con `activo=true`, ordenados alfabéticamente por palabra

#### Scenario: Cambiar el filtro a solo inactivos
- **WHEN** el usuario selecciona el filtro "Solo inactivos"
- **THEN** la tabla muestra únicamente los términos con `activo=false`, ordenados alfabéticamente

#### Scenario: Cambiar el filtro a todos los estados
- **WHEN** el usuario selecciona el filtro "Todos"
- **THEN** la tabla muestra todos los términos independientemente de su estado activo, ordenados alfabéticamente

#### Scenario: Sin términos en la vista actual
- **WHEN** el filtro activo no tiene resultados
- **THEN** la tabla muestra un mensaje vacío indicando que no hay términos para el estado seleccionado

### Requirement: Búsqueda por coincidencia parcial con debounce

La pantalla SHALL exponer un campo de búsqueda que filtra la lista visible por coincidencia parcial de la palabra. La búsqueda MUST ser insensible a mayúsculas y MUST preservar las tildes en la comparación. El envío del término al servidor MUST ocurrir con un debounce de 300 ms tras la última pulsación de tecla. El texto coincidente SHOULD resaltarse visualmente.

#### Scenario: Buscar un término existente
- **WHEN** el usuario escribe "ale" en el campo de búsqueda
- **THEN** la tabla muestra únicamente los términos cuya palabra contiene "ale", combinado con el filtro de estado activo vigente, y el fragmento "ale" aparece resaltado en cada resultado

#### Scenario: Búsqueda sin resultados
- **WHEN** el texto de búsqueda no coincide con ningún término del filtro activo
- **THEN** la tabla muestra un mensaje vacío indicando que no hay resultados para esa búsqueda

#### Scenario: Limpiar la búsqueda
- **WHEN** el usuario borra el texto del campo de búsqueda
- **THEN** la tabla vuelve a mostrar todos los términos del filtro de estado activo vigente

### Requirement: Formulario de creación siempre visible

La pantalla SHALL exponer un formulario en la parte superior para crear un término nuevo con los campos palabra, idioma (`es` o `en`) y valor decimal. El formulario MUST validar los campos antes del envío. Tras una creación exitosa el formulario MUST limpiarse y el nuevo término MUST aparecer en la tabla sin recargar la página.

#### Scenario: Crear un término válido
- **WHEN** el usuario completa palabra, idioma y valor válidos y confirma el formulario
- **THEN** el sistema envía `POST /api/v1/dictionary`, el término aparece en la tabla de inmediato y el formulario queda vacío

#### Scenario: Intentar crear con campos vacíos
- **WHEN** el usuario confirma el formulario con la palabra o el valor vacíos
- **THEN** el formulario señala visualmente los campos inválidos y no realiza ninguna llamada a la API

#### Scenario: Conflicto de término duplicado
- **WHEN** el servidor responde `400` al intentar crear un término porque ya existe la combinación palabra+idioma
- **THEN** la UI muestra una notificación de error con el motivo y conserva los datos en el formulario

### Requirement: Edición inline de términos

La pantalla SHALL permitir editar palabra, idioma y valor de un término existente directamente en la fila de la tabla, sin abrir un diálogo modal. Al activar la edición la fila MUST expandirse para mostrar los controles editables. Al guardar, los cambios MUST reflejarse en la tabla de inmediato.

#### Scenario: Activar la edición de una fila
- **WHEN** el usuario pulsa "Editar" en una fila
- **THEN** la fila se expande mostrando los campos editables con los valores actuales del término

#### Scenario: Guardar una edición válida
- **WHEN** el usuario modifica al menos un campo y confirma la edición
- **THEN** el sistema envía `PATCH /api/v1/dictionary/{id}`, la fila colapsa y muestra los valores actualizados

#### Scenario: Cancelar la edición
- **WHEN** el usuario cancela durante la edición
- **THEN** la fila colapsa y los valores originales del término se preservan sin cambios

#### Scenario: Conflicto al guardar la edición
- **WHEN** el servidor responde `400` al guardar porque el cambio genera una combinación palabra+idioma ya existente
- **THEN** la UI muestra una notificación de error y la fila permanece en modo edición con los valores ingresados

### Requirement: Eliminación lógica con confirmación inline

La pantalla SHALL permitir eliminar un término directamente desde la fila. La acción MUST solicitar confirmación inline antes de enviar la solicitud al servidor. Tras la confirmación el sistema MUST enviar `DELETE /api/v1/dictionary/{id}`.

#### Scenario: Eliminar un término activo
- **WHEN** el usuario confirma la eliminación en una fila
- **THEN** el sistema envía `DELETE /api/v1/dictionary/{id}` y la fila desaparece de la tabla de inmediato en la vista de activos

#### Scenario: Cancelar la eliminación
- **WHEN** el usuario descarta la confirmación inline
- **THEN** no se realiza ninguna llamada a la API y el término permanece sin cambios

### Requirement: Barra visual de valor

La tabla SHALL mostrar una barra visual proporcional al valor de cada término, coloreada en azul para valores positivos y rojo para valores negativos. El formulario de creación y la fila de edición MUST mostrar una vista previa actualizada en tiempo real.

#### Scenario: Renderizar la barra de un valor positivo
- **WHEN** un término tiene valor positivo
- **THEN** la barra aparece en tono azul proporcional al valor

#### Scenario: Renderizar la barra de un valor negativo
- **WHEN** un término tiene valor negativo
- **THEN** la barra aparece en tono rojo proporcional al valor absoluto

### Requirement: Notificaciones de resultado de operaciones

La pantalla SHALL mostrar notificaciones tipo toast tras cada operación CRUD completada o fallida. Las notificaciones de éxito MUST desaparecer automáticamente tras 3 segundos y las de error MUST permanecer hasta su descarte.

#### Scenario: Notificación de creación exitosa
- **WHEN** se crea un término correctamente
- **THEN** aparece una notificación de éxito con el nombre del término creado

#### Scenario: Notificación de error de la API
- **WHEN** la API responde con un error a cualquier operación CRUD
- **THEN** aparece una notificación de error con el motivo recibido de la API
