# Tasks

## 1. Auditar y preparar la representación de fuentes

- [x] 1.1 Comparar `HumWorld Prototipo.html` con `SourcesPage`, `SourceTable`, `SourceDrawer`, `DeleteSourceModal` y sus estilos; registrar las diferencias visuales y verificar que el alcance se limite a `frontend/`.
- [x] 1.2 Corregir textos, etiquetas accesibles y caracteres mal codificados de la pantalla; verificar mediante búsqueda que no queden secuencias mojibake en los archivos afectados.
- [x] 1.3 Ajustar el agrupamiento por canal y el mapeo DTO/dominio sin cambiar el contrato de `/api/v1/sources`; verificar con las pruebas de fuentes que una respuesta con varias filas del mismo canal produce un único grupo.

## 2. Igualar la pantalla al prototipo

- [x] 2.1 Ajustar la estructura de `SourcesPage` para reproducir encabezado, filtros, contador, acción principal y estados de carga/error/vacío; verificar los estados con las pruebas de la página.
- [x] 2.2 Ajustar tabla, filas anidadas, interruptores, botones, drawer y modal para coincidir con el layout, colores, tipografías, bordes y espaciado del HTML; verificar visualmente en el mismo viewport del prototipo.
- [x] 2.3 Mantener validaciones de formularios, expansión/colapso, confirmaciones, toasts y revertido de mutaciones fallidas; verificar creación, edición, activación, eliminación y errores con pruebas de componentes o página.
- [x] 2.4 Comunicar en la UI las acciones de canal que no tienen endpoint o estado propio en backend, sin simular persistencia; verificar que no se emita ninguna petición no soportada.

## 3. Verificar integración y entrega frontend

- [x] 3.1 Verificar que las operaciones de la pantalla llamen únicamente `GET/POST/PUT/PATCH/DELETE /api/v1/sources` y respeten los payloads y respuestas actuales mediante pruebas del cliente API.
- [x] 3.2 Ejecutar lint, pruebas y build del frontend; corregir cualquier regresión introducida en la página de fuentes.
- [x] 3.3 Comparar la página renderizada con `C:\Users\M\Downloads\HumWorld Prototipo.html` y documentar cualquier diferencia inevitable por capacidades ausentes del backend.
- [x] 3.4 Confirmar con `git diff -- backend` y `git status` que no se modificó ningún archivo del backend y que los cambios quedan limitados a frontend y artefactos OpenSpec.

## 4. Segunda pasada de fidelidad y capacidades bloqueadas

- [x] 4.1 Comparar de nuevo toda la ruta `/fuentes` con `HumWorld Prototipo.html` e inventariar cada elemento visual que todavía falte; verificar que el inventario incluya controles, columnas, estados, drawer y modal.
- [x] 4.2 Conservar todos los elementos visuales faltantes y aplicarles estado bloqueado/no editable cuando dependan de backend ausente; verificar que cada uno muestre `REQUIERE BACK` como en `/parametros`.
- [x] 4.3 Añadir o actualizar pruebas para confirmar que los elementos bloqueados son visibles, accesibles como no disponibles y no generan peticiones; verificar con `npm.cmd run test -- --run`.
- [x] 4.4 Ejecutar comparación visual final, lint y build; verificar que no haya cambios en `backend/` y que la página conserve la integración de las operaciones soportadas.

## Workflow follow-up

- Revisar los artefactos con el usuario antes de iniciar la implementación.
- Cuando el usuario lo solicite explícitamente, aplicar el cambio mediante `$openspec-apply-change`.
