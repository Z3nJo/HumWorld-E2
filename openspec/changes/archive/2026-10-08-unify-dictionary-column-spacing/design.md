# Design

## Context

La tabla del diccionario usa layout automático y define anchos directamente en algunas celdas de `TermRow`. El contenido de acciones cambia según el estado del término: las filas activas muestran dos botones y las inactivas una etiqueta `INACTIVO`; ese cambio permite que el navegador redistribuya el ancho disponible.

## Goals / Non-Goals

**Goals:**

- Fijar una geometría de columnas equivalente a la vista actual `Solo activos`.
- Reservar el espacio de acciones sin permitir que su contenido mueva `Término`, `Idioma` o `Valor`.
- Mantener el comportamiento responsive existente mediante el desplazamiento horizontal disponible.

**Non-Goals:**

- Cambiar los filtros, el orden, la paginación o la información mostrada.
- Rediseñar los botones, badges o barras de valor.
- Modificar la API o el modelo de datos.

## Decisions

### Columnas con distribución explícita

La tabla utilizará una definición común de columnas —preferentemente un `colgroup` con `table-layout: fixed`, o el equivalente CSS centralizado— para que la columna de término ocupe el espacio flexible y `Idioma`, `Valor` y `Acciones` conserven anchos estables. Los anchos de `Idioma` y `Valor` conservarán los valores actualmente usados por las filas; la columna de acciones tendrá espacio suficiente para los controles de la vista `Solo activos`.

Esto se elige sobre depender de `width` inline en cada `td`, porque el layout automático puede ignorar o reajustar esos anchos cuando cambia la longitud del contenido de acciones. También se descarta añadir espacios invisibles al texto de las filas: sería frágil, afectaría accesibilidad y no garantiza una geometría común.

### Verificación visual y automatizada

Se ampliarán las pruebas de `DictionaryPage` para comprobar que las tres opciones de estado siguen mostrando sus filas y que la tabla conserva una estructura de columnas común. La verificación manual deberá comparar `Solo activos`, `Solo inactivos` y `Todos`, con ambos idiomas y con una fila inactiva visible.

## Risks / Trade-offs

- [Riesgo] En ventanas muy estrechas, una distribución fija puede requerir desplazamiento horizontal → conservar el contenedor con `overflow-x: auto` y no reducir las columnas por debajo de sus anchos legibles.
- [Riesgo] Un texto de término excepcionalmente largo puede desbordar la celda → mantener el comportamiento de envoltura o truncado ya definido por la UI y verificarlo sin cambiar el espaciado de las otras columnas.

## Migration Plan

No hay migración de datos ni cambios de API. Se actualizan los estilos/estructura del componente, se ejecutan las pruebas del frontend y se valida visualmente la tabla antes de publicar.
