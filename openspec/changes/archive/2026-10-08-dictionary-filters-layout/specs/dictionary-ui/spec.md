# Spec Delta

## MODIFIED Requirements

### Requirement: Pantalla de listado con filtro de estado activo

La pantalla SHALL mostrar los términos del diccionario en una tabla ordenada alfabéticamente. El filtro de estado activo MUST ofrecer tres vistas seleccionables: solo activos, solo inactivos y todos. Al cambiar el filtro la tabla MUST actualizarse de inmediato sin recarga de página.

#### Scenario: Cargar la pantalla por primera vez
- **WHEN** el usuario navega a la pantalla del diccionario
- **THEN** la tabla muestra únicamente los términos con `activo=true`, ordenados alfabéticamente por palabra y el control `Solo activos` aparece seleccionado

#### Scenario: Cambiar el filtro a solo inactivos
- **WHEN** el usuario selecciona `Solo inactivos`
- **THEN** la tabla muestra únicamente términos con `activo=false`, conserva el orden determinista y mantiene el espaciado de `Solo activos`

#### Scenario: Cambiar el filtro a todos los estados
- **WHEN** el usuario selecciona `Todos`
- **THEN** la tabla muestra términos de cualquier estado, conserva el orden determinista, distingue los inactivos y mantiene el espaciado de `Solo activos`

#### Scenario: Sin términos en la vista actual
- **WHEN** el idioma o estado seleccionado no tiene resultados
- **THEN** la tabla muestra un mensaje vacío coherente con los filtros activos

### Requirement: Búsqueda por coincidencia parcial con debounce

La pantalla SHALL exponer un campo de búsqueda que filtra la lista visible por coincidencia parcial de la palabra. La búsqueda MUST ser insensible a mayúsculas y MUST preservar las tildes en la comparación. El envío del término al servidor MUST ocurrir con un debounce de 300 ms tras la última pulsación de tecla. El texto coincidente SHOULD resaltarse visualmente.

#### Scenario: Buscar un término existente
- **WHEN** el usuario escribe `ale` en el campo de búsqueda
- **THEN** después de 300 ms se consulta el servidor y se muestran coincidencias combinadas con idioma y estado

#### Scenario: Búsqueda sin resultados
- **WHEN** el texto no coincide con ningún término de los filtros activos
- **THEN** la tabla muestra un mensaje vacío

#### Scenario: Limpiar la búsqueda
- **WHEN** el usuario borra el texto
- **THEN** la tabla vuelve a mostrar los términos de los filtros activos sin solicitar cada pulsación intermedia
