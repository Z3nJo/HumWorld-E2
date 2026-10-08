# Spec Delta

## MODIFIED Requirements

### Requirement: Espaciado uniforme de la tabla

La tabla SHALL conservar en todas las combinaciones de idioma y estado el mismo espaciado entre las columnas `Término`, `Idioma` y `Valor` que presenta la vista inicial `Solo activos`. La distribución SHALL permanecer estable aunque cambie el contenido o el ancho visual de la columna de acciones.

#### Scenario: Cambiar idioma o estado
- **WHEN** el usuario cambia el idioma o selecciona `Solo activos`, `Solo inactivos` o `Todos`
- **THEN** la separación entre `Término`, `Idioma` y `Valor` permanece idéntica a la de `Solo activos`

#### Scenario: Mostrar acciones distintas por estado
- **WHEN** la tabla muestra acciones de edición y eliminación para términos activos o una marca `INACTIVO` para términos inactivos
- **THEN** las columnas `Término`, `Idioma` y `Valor` conservan las mismas posiciones y anchos visuales
