# Proposal

## Why

Las vistas `Solo activos`, `Solo inactivos` y `Todos` no conservan siempre la misma separación visual entre `Término`, `Idioma` y `Valor`. Esto dificulta comparar las filas al cambiar de filtro; la distribución de `Solo activos` debe ser la referencia estable para todas las vistas.

## What Changes

- Mantener en `Solo inactivos` y `Todos` exactamente el mismo espaciado de columnas que en `Solo activos`.
- Evitar que el ancho o el contenido de la columna de acciones redistribuya las columnas `Término`, `Idioma` y `Valor`.
- Conservar el filtrado, orden, indicadores de estado y acciones actuales sin cambios funcionales.
- Verificar el resultado en las tres vistas y con los filtros de idioma disponibles.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `dictionary-ui`: reforzar el requisito de que la separación entre `Término`, `Idioma` y `Valor` sea idéntica a la de `Solo activos` en las tres vistas de estado, independientemente del contenido de las acciones.

## Impact

- Frontend: estilos y/o estructura de la tabla del diccionario, principalmente `TermTable` y `TermRow`.
- Pruebas de la pantalla del diccionario para cubrir las tres vistas de estado.
- No se modifican endpoints, contratos de API, persistencia ni datos.
