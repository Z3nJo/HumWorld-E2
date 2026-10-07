# Spec Delta

## Purpose

La capacidad permite navegar de forma predecible y accesible por listados de términos del diccionario que contienen más resultados de los que caben cómodamente en una sola vista.

## ADDED Requirements

### Requirement: Listado paginado de términos

La pantalla SHALL mostrar como máximo 12 términos por página, manteniendo el orden alfabético y el total de resultados correspondiente a la búsqueda y al filtro de estado activos.

#### Scenario: Primera página con más de 12 términos
- **WHEN** existen más de 12 términos visibles al cargar el diccionario
- **THEN** la tabla muestra los primeros 12 términos y el control de página indica `Página 1` junto con el rango `1–12 de N`

#### Scenario: Última página con menos de 12 términos
- **WHEN** el usuario navega a la última página y el total no es múltiplo de 12
- **THEN** la tabla muestra únicamente los términos restantes y el rango finaliza en el total real de resultados

### Requirement: Navegación entre páginas

La pantalla SHALL ofrecer controles `Anterior` y `Siguiente` para cambiar de página sin recargarla, y SHALL deshabilitar cada control cuando no exista una página válida en esa dirección.

#### Scenario: Avanzar a la siguiente página
- **WHEN** el usuario pulsa `Siguiente` mientras existen más resultados posteriores
- **THEN** la tabla muestra el siguiente grupo de hasta 12 términos y el indicador de página se incrementa en uno

#### Scenario: Volver a la página anterior
- **WHEN** el usuario pulsa `Anterior` mientras no está en la primera página
- **THEN** la tabla muestra el grupo anterior de términos y el indicador de página disminuye en uno

#### Scenario: Extremos de la navegación
- **WHEN** el usuario está en la primera o en la última página
- **THEN** el botón correspondiente (`Anterior` o `Siguiente`) aparece deshabilitado y no cambia el listado

### Requirement: Reinicio de página al cambiar resultados

La pantalla SHALL volver a la primera página cuando cambie la búsqueda o el filtro de estado, y SHALL conservar la primera página válida después de crear o eliminar un término.

#### Scenario: Cambiar la búsqueda desde una página posterior
- **WHEN** el usuario modifica o limpia la búsqueda mientras está en una página posterior
- **THEN** la tabla muestra la primera página de los resultados actualizados

#### Scenario: Cambiar el filtro de estado
- **WHEN** el usuario selecciona otro filtro de estado
- **THEN** la tabla muestra la primera página de los resultados del nuevo filtro

#### Scenario: Resultado que deja una página fuera de rango
- **WHEN** una operación CRUD reduce el total de resultados por debajo de la página actual
- **THEN** la pantalla ajusta la página a la última página válida y no muestra una tabla vacía incorrectamente
