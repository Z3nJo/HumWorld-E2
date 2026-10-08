# Spec Delta

## MODIFIED Requirements

### Requirement: Pantalla de listado con filtro de estado activo

La pantalla SHALL mostrar los términos del diccionario en una tabla ordenada alfabéticamente. El filtro de estado activo MUST ofrecer tres vistas seleccionables: solo activos, solo inactivos y todos. Al cambiar el filtro la tabla MUST actualizarse de inmediato sin recarga de página.

#### Scenario: Cargar la pantalla por primera vez
- **WHEN** el usuario navega a la pantalla del diccionario
- **THEN** la tabla muestra únicamente los términos con `activo=true`, ordenados alfabéticamente por palabra y el control "Solo activos" aparece seleccionado

#### Scenario: Cambiar el filtro a solo inactivos
- **WHEN** el usuario selecciona el filtro "Solo inactivos"
- **THEN** la tabla muestra únicamente los términos con `activo=false`, ordenados alfabéticamente y los términos inactivos se muestran con una marca visual de estado

#### Scenario: Cambiar el filtro a todos los estados
- **WHEN** el usuario selecciona el filtro "Todos"
- **THEN** la tabla muestra todos los términos independientemente de su estado activo, ordenados alfabéticamente y distingue visualmente los inactivos

#### Scenario: Sin términos en la vista actual
- **WHEN** el filtro activo no tiene resultados
- **THEN** la tabla muestra un mensaje vacío indicando que no hay términos para el estado seleccionado

### Requirement: Búsqueda por coincidencia parcial con debounce

La pantalla SHALL exponer un campo de búsqueda que filtra la lista visible por coincidencia parcial de la palabra. La búsqueda MUST ser insensible a mayúsculas y MUST preservar las tildes en la comparación. El envío del término al servidor MUST ocurrir con un debounce de 300 ms tras la última pulsación de tecla. El texto coincidente SHOULD resaltarse visualmente.

#### Scenario: Buscar un término existente
- **WHEN** el usuario escribe "ale" en el campo de búsqueda
- **THEN** después de 300 ms sin nuevas pulsaciones se consulta el servidor y la tabla muestra únicamente los términos cuya palabra contiene "ale", combinado con el filtro de estado activo vigente, con el fragmento "ale" resaltado

#### Scenario: Búsqueda sin resultados
- **WHEN** el texto de búsqueda no coincide con ningún término del filtro activo
- **THEN** la tabla muestra un mensaje vacío indicando que no hay resultados para esa búsqueda

#### Scenario: Limpiar la búsqueda
- **WHEN** el usuario borra el texto del campo de búsqueda
- **THEN** la tabla vuelve a mostrar todos los términos del filtro de estado activo vigente sin realizar solicitudes por cada pulsación intermedia
