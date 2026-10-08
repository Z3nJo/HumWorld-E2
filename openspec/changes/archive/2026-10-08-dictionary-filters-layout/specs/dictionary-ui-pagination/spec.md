# Spec Delta

## MODIFIED Requirements

### Requirement: Listado paginado de términos

La pantalla SHALL mostrar como máximo 12 términos por página, manteniendo el orden alfabético y el total de resultados correspondiente a la búsqueda y a los filtros de idioma y estado activos.

#### Scenario: Primera página con más de 12 términos
- **WHEN** existen más de 12 términos visibles al cargar el diccionario
- **THEN** la tabla muestra los primeros 12 términos y el control indica `Página 1` junto con el rango `1–12 de N`

#### Scenario: Última página con menos de 12 términos
- **WHEN** el usuario navega a la última página y el total no es múltiplo de 12
- **THEN** la tabla muestra únicamente los términos restantes y el rango finaliza en el total real

### Requirement: Reinicio de página al cambiar resultados

La pantalla SHALL volver a la primera página cuando cambie la búsqueda o cualquier filtro de idioma o estado, y SHALL conservar la primera página válida después de crear o eliminar un término.

#### Scenario: Cambiar la búsqueda desde una página posterior
- **WHEN** el usuario modifica o limpia la búsqueda mientras está en una página posterior
- **THEN** la tabla muestra la primera página de los resultados actualizados después de completarse el debounce

#### Scenario: Cambiar el filtro de estado
- **WHEN** el usuario selecciona otro filtro de idioma o estado
- **THEN** la tabla muestra la primera página de los resultados del nuevo conjunto de filtros

#### Scenario: Resultado que deja una página fuera de rango
- **WHEN** una operación CRUD reduce el total por debajo de la página actual
- **THEN** la pantalla ajusta la página a la última página válida
