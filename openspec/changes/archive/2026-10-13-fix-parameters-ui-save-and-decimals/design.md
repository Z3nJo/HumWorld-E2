# Design

## Context

Véase `proposal.md` para la motivación. En el hook `useConfig`, los errores de GET y PUT compartían la variable `error`. En `ParametersPage`, cualquier error ocultaba el formulario y mostraba un botón de Reintentar que desencadenaba un GET. En `ConfigCards`, los inputs numéricos usaban `parseInt`, truncando decimales en lugar de dejar que `Number.isInteger` los rechace. Por último, los estilos de `ParametersPage.css` utilizaban clases genéricas `.btn`, `.inp`, `.top`, `.view` colisionando con `DictionaryPage.css`.

## Goals / Non-Goals

**Goals:**
- Separar explícitamente `loadError` y `saveError` en `useConfig`.
- Preservar el borrador y la visibilidad del formulario ante fallos de `PUT` en `ParametersPage`.
- Utilizar `valueAsNumber` en los inputs controlados de `ConfigCards`.
- Prefijar clases específicas en `ParametersPage.css` (`.params-top`, `.params-view`, `.params-btn`, `.params-inp`).
- Proporcionar pruebas unitarias completas para los nuevos flujos.

**Non-Goals:**
- Modificar el backend o el contrato REST de `/api/v1/config`.
- Implementar soporte para `humor.minimo_noticias_agregacion` en el backend.

## Decisions

- **Decisión 1: Separación de estados de error con alias retrocompatible.**
  - *Elección*: Declarar `loadError` y `saveError`, exponiendo `error: loadError ?? saveError` para no romper consumidores existentes del hook.
  - *Alternativa descartada*: Mantener un único `error` con flags booleanos, lo que añade complejidad innecesaria.

- **Decisión 2: Utilizar `valueAsNumber` en inputs numéricos.**
  - *Elección*: Usar `event.target.valueAsNumber`. Si el usuario teclea `1.5`, el valor numérico recibido es `1.5`, permitiendo a `validateConfig` detectar que no es entero (`!Number.isInteger`).
  - *Alternativa descartada*: Mantener `parseInt`, que trunca silenciosamente a `1`.

- **Decisión 3: Prefijo de namespace en estilos de página.**
  - *Elección*: Usar prefijo `.params-*` para los elementos de estructura, botones e inputs de `ParametersPage`.

## Risks / Trade-offs

- [Campos vacíos con `valueAsNumber`] → Devuelve `NaN`. Mitigación: `validateConfig` ya contempla `Number.isNaN()` y asigna el error "La periodicidad es obligatoria".
