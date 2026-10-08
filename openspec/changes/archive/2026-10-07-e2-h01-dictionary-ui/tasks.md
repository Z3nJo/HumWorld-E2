# Tasks

## 1. Fundación: tipos, API client y tokens de color

- [x] 1.1 Crear `src/types/dictionary.ts` con la interfaz `Term` (id, word, lang, value, active, created_at, updated_at) y verificar que TypeScript compila sin errores.
- [x] 1.2 Crear `src/api/dictionary.ts` con las funciones `fetchTerms(q?: string)`, `createTerm(...)`, `patchTerm(id, ...)` y `deleteTerm(id)` que consumen `VITE_API_URL` y lanzan error con el mensaje de la API en caso de fallo. Verificar que las funciones tienen tipado correcto compilando con `tsc --noEmit`.
- [x] 1.3 Añadir a `index.css` los tokens `--positive`, `--negative`, `--success`, `--warning`, `--sidebar-bg`, `--sidebar-text` y `--sidebar-active` según el diseño. Verificar que la app sigue arrancando sin errores de consola.

## 2. App Shell: sidebar y routing

- [x] 2.1 Crear `src/components/AppShell/AppShell.tsx` con el sidebar (logo HumWorld, secciones Análisis y Administración, ítems de navegación, footer con enlaces API/docs/prototipo) y el `<Outlet />` de react-router-dom. Verificar que el componente renderiza sin errores.
- [x] 2.2 Crear `src/components/AppShell/AppShell.css` con los estilos del sidebar oscuro (fondo `--sidebar-bg`, texto `--sidebar-text`, ítem activo con `--sidebar-active`, separadores de sección). Verificar que el layout visual coincide con la imagen de referencia.
- [x] 2.3 Reemplazar `src/App.tsx` con `createBrowserRouter` de react-router-dom@7 que define las rutas `/` (redirect a `/dictionary`) y `/dictionary` (DictionaryPage dentro de AppShell). Verificar navegando a `/` que redirige a `/dictionary` en el navegador.
- [x] 2.4 Verificar que el ítem "Diccionario" del sidebar aparece con estilo activo al estar en `/dictionary` y que el ítem pierde el estilo activo al navegar a otra ruta.

## 3. Hook de diccionario y filtros de estado

- [x] 3.1 Crear `src/pages/Dictionary/hooks/useDictionary.ts` con estado `terms`, `loading`, `error`, la función `load(q?, status?)` que llama a `fetchTerms` y aplica el filtro de estado (`active`/`inactive`/`all`) en cliente. Verificar que el hook devuelve los datos correctamente con datos mockeados en un componente temporal.
- [x] 3.2 Crear `src/pages/Dictionary/hooks/useDebounce.ts` con el hook genérico de debounce de 300 ms. Verificar que un cambio rápido en el valor de entrada solo dispara el efecto una vez tras el delay.
- [x] 3.3 Añadir a `useDictionary` las operaciones optimistas `addTerm`, `updateTerm` y `removeTerm` con rollback en caso de error de API. Verificar que al fallar la API el estado regresa al valor anterior.

## 4. Componentes de presentación básicos

- [x] 4.1 Crear `src/pages/Dictionary/components/LangBadge.tsx` con el badge visual `ES` / `EN` y sus estilos en `TermRow.css`. Verificar que renderiza el texto correcto según el prop `lang`.
- [x] 4.2 Crear `src/pages/Dictionary/components/ValueBar.tsx` con la barra proporcional (azul positivo, rojo negativo) que recibe `value` y `maxAbsValue`. Verificar que una barra positiva es azul y una negativa es roja en el DOM.
- [x] 4.3 Crear `src/pages/Dictionary/components/StatusFilter.tsx` con los tres botones de filtro (Solo activos, Solo inactivos, Todos) y sus estilos. Verificar que al pulsar cada botón se resalta el seleccionado y se emite el valor correcto via callback.
- [x] 4.4 Crear `src/pages/Dictionary/components/SearchBar.tsx` con el input de búsqueda y el contador de términos visibles. Verificar que el input emite el valor con el callback `onChange`.

## 5. Tabla de términos: lectura

- [x] 5.1 Crear `src/pages/Dictionary/components/TermTable.tsx` con el encabezado (TÉRMINO, IDIOMA, VALOR, columna de acciones) y la iteración de filas `TermRow`. Crear `src/pages/Dictionary/components/TermRow.tsx` con la fila en modo lectura (LangBadge, ValueBar, botones Editar / Eliminar). Verificar que la tabla renderiza una lista de términos pasada como prop con los datos correctos.
- [x] 5.2 Añadir resaltado del texto buscado en `TermRow`: envolver el fragmento coincidente con `<mark>` estilizado con `--accent-bg`. Verificar que al pasar `highlight="ale"` la palabra "alegría" muestra "ale" resaltado.
- [x] 5.3 Añadir `TermTable.css` con los estilos de tabla (border-bottom entre filas, padding de celdas, hover sutil sobre la fila). Verificar el aspecto visual en el navegador.
- [x] 5.4 Añadir el estado vacío a `TermTable`: cuando no hay términos mostrar un mensaje descriptivo que indique si es por el filtro de estado o por la búsqueda. Verificar que el mensaje aparece al filtrar a un estado sin resultados.

## 6. Tabla de términos: edición inline

- [x] 6.1 Crear `src/pages/Dictionary/components/TermRowEdit.tsx` con la fila expandida en modo edición: inputs para palabra, idioma y valor, más la mini `ValueBar` de preview en tiempo real, botones Guardar y Cancelar. Verificar que los inputs se inicializan con los valores del término.
- [x] 6.2 Conectar el botón Guardar de `TermRowEdit` con `updateTerm` del hook. Verificar que al guardar la fila colapsa y muestra los nuevos valores en `TermRow`.
- [x] 6.3 Añadir la animación de expansión/colapso de la fila de edición con `max-height` transition en CSS (duración 200 ms). Verificar que la transición es visible al activar y cancelar la edición.
- [x] 6.4 Verificar que al guardar una edición que genera un duplicado, la UI muestra un toast de error y la fila permanece en modo edición.

## 7. Tabla de términos: eliminación con confirmación inline

- [x] 7.1 Añadir el estado de confirmación inline a `TermRow`: al pulsar "Eliminar" el botón se reemplaza por "¿Seguro?" con opciones "Sí, eliminar" y "No". Verificar que pulsar "No" restaura el botón original sin llamar a la API.
- [x] 7.2 Conectar el botón "Sí, eliminar" con `removeTerm` del hook. Verificar que tras confirmar el término desaparece de la tabla en el filtro "Solo activos" y permanece con aspecto atenuado en el filtro "Todos".
- [x] 7.3 Añadir la animación de salida de la fila eliminada con `fade-out + slide-up` keyframe (220 ms) antes de quitarla del DOM. Verificar que la animación se ejecuta visiblemente al eliminar un término.

## 8. Formulario de creación

- [x] 8.1 Crear `src/pages/Dictionary/components/AddTermForm.tsx` con los campos palabra (input texto), idioma (select Español/Inglés), valor (input numérico) y el botón Añadir. Incluir la mini `ValueBar` de preview del valor. Crear `AddTermForm.css`. Verificar que el formulario renderiza correctamente.
- [x] 8.2 Conectar el formulario con `addTerm` del hook. Verificar que al enviar datos válidos el término aparece en la tabla de inmediato y el formulario queda limpio.
- [x] 8.3 Añadir validación del formulario: mostrar error visual (borde rojo + texto descriptivo) en los campos vacíos o inválidos sin llamar a la API. Verificar que el formulario con palabra vacía no dispara la llamada y muestra el estado de error.
- [x] 8.4 Añadir la animación `shake` keyframe en el formulario cuando se intenta enviar con campos inválidos. Verificar que la animación se ejecuta al pulsar Añadir con campos vacíos.

## 9. Sistema de notificaciones toast

- [x] 9.1 Crear `src/hooks/useToast.ts` con el estado de notificaciones (array de `{id, message, type: 'success'|'error'}`), las funciones `addToast` y `removeToast`, y auto-dismiss de 3 s para los de tipo `success`. Verificar que el hook añade y elimina correctamente con un test manual.
- [x] 9.2 Crear `src/components/Toast/ToastItem.tsx` y `Toast.css` con los estilos de toast (slide-in desde la derecha, fondo diferenciado por tipo, botón de cierre manual para errores). Verificar que el toast de éxito desaparece automáticamente en ~3 s.
- [x] 9.3 Crear `src/components/Toast/ToastContainer.tsx` que monta los toasts en un portal al `document.body` en la esquina superior derecha. Verificar que los toasts aparecen sobre el contenido sin desplazar el layout.
- [x] 9.4 Conectar `addToast` a cada operación CRUD exitosa o fallida en `DictionaryPage`. Verificar que crear, editar y eliminar un término produce el toast correcto con el mensaje esperado.

## 10. Pantalla principal y ensamblaje final

- [x] 10.1 Crear `src/pages/Dictionary/DictionaryPage.tsx` que ensambla `AddTermForm`, `StatusFilter`, `SearchBar` y `TermTable`, pasando el estado de `useDictionary` y `useToast`. Crear `DictionaryPage.css`. Verificar que la pantalla completa renderiza sin errores en el navegador.
- [x] 10.2 Verificar el flujo completo con la API real: crear un término → aparece en tabla → editarlo → los valores se actualizan → eliminarlo → desaparece. Todo sin recargar la página.
- [x] 10.3 Verificar que los tres filtros de estado (Solo activos, Solo inactivos, Todos) funcionan correctamente combinados con la búsqueda por texto.
- [x] 10.4 Verificar que la animación de entrada de nuevas filas (slide-down + fade-in, 250 ms) se ejecuta al crear un término y que la barra de valor de la nueva fila se anima correctamente.

## Workflow follow-up

- Revisar los artifacts creados con el equipo antes de proceder al apply.
- Archivar el cambio tras completar la implementación y validar el criterio de finalización: la UI permite crear, listar, buscar, editar y eliminar términos reflejando los cambios de inmediato.
