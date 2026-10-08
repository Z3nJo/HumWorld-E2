# Tasks

## 1. Fijar la geometría de la tabla

- [x] 1.1 Centralizar la definición de las columnas de `TermTable` y reservar anchos estables para `Idioma`, `Valor` y `Acciones`, tomando `Solo activos` como referencia; verificar que el contenido `INACTIVO` no redistribuye las columnas.
- [x] 1.2 Ajustar `TermRow` para que sus celdas utilicen la estructura común sin alterar el contenido ni las acciones existentes; verificar que activos, inactivos y todos conservan las mismas posiciones de columnas.

## 2. Pruebas y validación visual

- [x] 2.1 Añadir o actualizar pruebas de `DictionaryPage` para recorrer `Solo activos`, `Solo inactivos` y `Todos` con términos activos e inactivos; verificar que las filas y sus indicadores de estado siguen siendo correctos.
- [x] 2.2 Ejecutar las pruebas y la compilación del frontend y revisar visualmente las tres vistas, ambos idiomas y una ventana estrecha; verificar que el espaciado coincide con `Solo activos` y que el desplazamiento horizontal sigue funcionando.
