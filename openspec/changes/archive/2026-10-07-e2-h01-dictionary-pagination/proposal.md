# Proposal

## Why

La página del diccionario actualmente muestra todos los términos a la vez, lo que hace que la tabla crezca demasiado y dificulta localizar información. El prototipo de HumWorld define una navegación paginada de 12 términos por página, con controles claros para avanzar y retroceder.

## What Changes

- Limitar el listado visible del diccionario a 12 términos por página.
- Añadir controles `Anterior` y `Siguiente` con estado deshabilitado en los extremos.
- Mostrar el rango visible y el total de resultados, junto con el número de página actual y total.
- Reiniciar la página a la primera cuando cambie la búsqueda o el filtro de estado.
- Mantener la paginación en el cliente sin modificar el contrato de la API.

## Capabilities

### New Capabilities

- `dictionary-ui`: navegación paginada del listado de términos del diccionario.

### Modified Capabilities

- Ninguna.

## Impact

- Afecta `DictionaryPage`, `TermTable` y los estilos asociados en el frontend.
- No requiere cambios en la API, la base de datos ni las operaciones CRUD existentes.
- La búsqueda, los filtros de estado, la creación, edición y eliminación deben continuar funcionando con la página visible actual.
