# Design

## Context

El frontend es un proyecto Vite + React 19 + TypeScript con Vanilla CSS. El `App.tsx` es el template por defecto de Vite; no existe ningún componente de aplicación real todavía. El backend expone el contrato REST de diccionario en `/api/v1/dictionary` sin autenticación. La URL base de la API se configura vía `VITE_API_URL` (ver `proposal.md`).

Las dependencias disponibles son: `react-router-dom@7`, `chart.js`, `d3-cloud`. No se añadirán nuevas dependencias.

## Goals / Non-Goals

**Goals:**
- Layout shell con sidebar y área de contenido montados desde cero.
- Pantalla de diccionario completamente funcional con CRUD inmediato.
- CSS colocado junto a cada componente, sin librerías de UI externas.
- Animaciones CSS nativas (transitions, keyframes) sin librerías de animación.
- Estado de UI manejado localmente con hooks de React (`useState`, `useEffect`, `useCallback`).

**Non-Goals:**
- Autenticación o gestión de sesión (la API no la requiere).
- Paginación del listado (la spec no la requiere; la API devuelve todos los términos).
- Tests automatizados en este cambio (fuera del alcance de E2-H01-UI).
- Soporte para otros idiomas distintos de `es` y `en`.
- Diseño responsive para móviles (la pantalla es una herramienta de administración de escritorio).

## Decisions

### D1: CSS colocado junto al componente (CSS Modules o archivos `.css` planos)

**Decisión:** Archivos `.css` planos colocados junto a cada componente (e.g., `TermRow.css` junto a `TermRow.tsx`), importados directamente en el componente. Se usan clases BEM-like con prefijo del componente para evitar colisiones (`dict-table__row`, `toast--success`).

**Alternativas consideradas:**
- CSS Modules: Añade complejidad de build sin beneficio real dado el alcance limitado de este cambio.
- Tailwind: Explícitamente fuera del stack del proyecto.
- Styled-components: Dependencia externa no deseada.

**Razón:** Coherente con `index.css` y `App.css` existentes. Cero configuración extra.

### D2: Estado local con hooks propios, sin store global

**Decisión:** `useDictionary` encapsula el estado de términos, carga y error, y expone las operaciones CRUD. `useToast` gestiona las notificaciones. El estado vive en `DictionaryPage` y se pasa hacia abajo via props.

**Alternativas consideradas:**
- Context API: Overkill; solo hay una pantalla que consume el diccionario.
- Zustand/Redux: Dependencias externas no deseadas para este alcance.

**Razón:** Simplicidad maxima. Si el estado necesita compartirse entre pantallas en el futuro, se puede elevar a un Context en ese momento.

### D3: Actualizaciones optimistas con rollback

**Decisión:** Las operaciones de creación, edición y eliminación actualizan el estado local antes de esperar la respuesta de la API. Si la API falla, el estado revierte al valor anterior y se muestra un toast de error.

**Razón:** La UI se percibe instantánea. La spec exige que los cambios se reflejen "de inmediato". El riesgo de inconsistencia es bajo porque la API es local y los errores son raros.

**Trade-off:** En caso de error de red transitorio, el usuario ve el cambio durante ~3-5 segundos antes del rollback. Aceptable para una herramienta de administración.

### D4: Edición inline sin modal

**Decisión:** Al pulsar "Editar", la fila `<tr>` se reemplaza por una fila de edición con inputs. La transición es una expansión vertical con `max-height` animation en CSS.

**Alternativas consideradas:**
- Modal: Interrumpe el contexto visual de la lista; no está justificado para solo 3 campos editables.
- Drawer lateral: Complejidad innecesaria.

**Razón:** Mantiene el contexto de la lista visible mientras se edita. Más liviano en código.

### D5: Confirmación inline de eliminación (no modal, no window.confirm)

**Decisión:** Al pulsar "Eliminar", el botón se reemplaza inline por dos botones: "¿Seguro?" con opciones "Sí" y "No". El estado de confirmación vive en `TermRow` como `useState<boolean>`.

**Razón:** La spec no especifica el mecanismo; se elige el más liviano que no requiera dependencias. `window.confirm` bloquea el hilo principal y no es customizable. Un modal sería sobrediseño para este caso.

### D6: Barra de valor sin rango fijo

**Decisión:** La barra de valor escala al valor máximo absoluto de la lista visible en ese momento (`Math.max(...terms.map(t => Math.abs(t.value)))`). Si todos los valores son 0, la barra tiene ancho 0.

**Razón:** La spec del backend (Requirement: Valor independiente de ADR-001) prohíbe imponer un rango emocional. La imagen de referencia muestra "-10 a +10" como hint de UI del formulario, pero eso es solo orientación para el usuario, no una restricción de validación.

### D7: Estructura de archivos

```
src/
├── components/
│   ├── AppShell/
│   │   ├── AppShell.tsx        ← sidebar + outlet
│   │   └── AppShell.css
│   └── Toast/
│       ├── ToastContainer.tsx  ← portal al body
│       ├── ToastItem.tsx
│       └── Toast.css
├── pages/
│   └── Dictionary/
│       ├── DictionaryPage.tsx
│       ├── DictionaryPage.css
│       ├── components/
│       │   ├── AddTermForm.tsx
│       │   ├── AddTermForm.css
│       │   ├── SearchBar.tsx
│       │   ├── SearchBar.css
│       │   ├── StatusFilter.tsx
│       │   ├── TermTable.tsx
│       │   ├── TermTable.css
│       │   ├── TermRow.tsx        ← vista normal
│       │   ├── TermRowEdit.tsx    ← inline edit
│       │   ├── TermRow.css
│       │   ├── ValueBar.tsx       ← barra visual
│       │   └── LangBadge.tsx      ← badge ES/EN
│       └── hooks/
│           ├── useDictionary.ts
│           └── useDebounce.ts
├── hooks/
│   └── useToast.ts
├── api/
│   └── dictionary.ts  ← fetch wrappers tipados
├── types/
│   └── dictionary.ts  ← interface Term
├── App.tsx            ← reemplazado con RouterProvider
└── main.tsx           ← sin cambios
```

### D8: Routing

Se usa `createBrowserRouter` de `react-router-dom@7`. Rutas:
```
/               → redirect a /dictionary
/dictionary     → DictionaryPage (dentro de AppShell)
```
`AppShell` usa `<Outlet />` de react-router para montar las pantallas.

### D9: Tokens de diseño y tipografía (Design System Prototipo Sprint 3)

Se configuran en `index.css`:
```css
--paper: #f5f2eb;      /* Fondo papel principal cálido */
--paper2: #ece7dc;     /* Fondo secundario / hover */
--card: #fcfbf7;       /* Fondo de tarjetas y componentes */
--ink: #1c1f26;        /* Tinta principal / texto oscuro */
--ink2: #40454f;       /* Tinta secundaria */
--ink3: #61656e;       /* Tinta terciaria / metadatos */
--line: #d9d2c3;       /* Bordes principales */
--line2: #e7e1d5;      /* Separadores tenues */
--neg: #bf4f22;        /* Sentimiento negativo (rojo/óxido) */
--pos: #285f9f;        /* Sentimiento positivo (azul) */
--neu: #e6e0d2;        /* Neutro */
--ann: #6446c0;        /* Anotaciones de diseño (púrpura) */
--warn: #f3e4c4;       /* Banner de advertencia entorno sin auth */
--serif: 'Newsreader', Georgia, serif;
--sans: 'IBM Plex Sans', system-ui, sans-serif;
--mono: 'IBM Plex Mono', ui-monospace, monospace;
```

## Risks / Trade-offs

- **Actualizaciones optimistas y race conditions** → El hook cancela la operación anterior con AbortController si el usuario edita/elimina rápidamente el mismo término. Aceptable como mitigación mínima.
- **Lista sin paginación** → Si el diccionario crece a miles de términos, la tabla puede volverse lenta. La spec no requiere paginación ahora; se añadirá cuando sea necesario.
- **Sin tests** → Los cambios en la API o en la normalización de términos podrían introducir regresiones visuales silenciosas. Se acepta para este cambio; se añadirán tests en un cambio posterior.

## Open Questions

~~- ¿Deberían los términos inactivos mostrar algún indicador visual específico (e.g., fila atenuada) cuando aparecen en la vista "Todos"?~~

**Resuelto:** Los términos inactivos en la vista "Todos" deben diferenciarse claramente de los activos. Se implementa con la siguiente combinación visual:
- `opacity: 0.45` en toda la fila
- La palabra del término se muestra en *cursiva*
- El badge de idioma (ES/EN) tiene un borde discontinuo en lugar de sólido
- Una etiqueta pequeña `INACTIVO` aparece al final de la fila, en lugar de los botones Editar/Eliminar (los términos inactivos no son editables desde la vista "Todos"; el usuario debe cambiar al filtro correspondiente si necesita operar sobre ellos, o se puede restaurar su estado activo desde esa misma etiqueta)
