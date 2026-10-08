# Design

## Context

La especificación existente contiene requisitos correctos, pero algunas descripciones concentran demasiadas reglas en un solo párrafo. La validación estricta de OpenSpec advierte sobre esa longitud. El delta mantiene los mismos encabezados y escenarios, reorganizando los detalles en escenarios verificables.

## Goals / Non-Goals

**Goals:**

- Hacer que las descripciones normativas de los requisitos modificados tengan menos de 500 caracteres.
- Preservar el significado funcional y la cobertura de escenarios.
- Permitir que la sincronización del delta produzca una especificación principal válida en modo estricto.

**Non-Goals:**

- Cambiar el algoritmo de sentimiento o sus parámetros.
- Cambiar endpoints, esquemas OpenAPI, persistencia o comportamiento runtime.
- Modificar código de backend o frontend.

## Decisions

1. **Usar un delta MODIFIED para la capacidad existente.** La capacidad conserva su ruta `news-sentiment-analysis`; no se crea una especificación paralela.

2. **Conservar los nombres y escenarios existentes.** Esto minimiza el riesgo de alterar trazabilidad. Cuando una regla importante estaba solo en la descripción, se expresa como escenario adicional.

3. **Separar la fórmula y la respuesta API en escenarios.** Las fórmulas, precisión, validaciones y campos de respuesta son comportamientos observables y quedan más fáciles de validar sin sobrecargar el texto normativo.

4. **Sin cambios de implementación.** La aplicación de este cambio solo sincronizará documentación OpenSpec; cualquier diferencia funcional descubierta deberá convertirse en otra propuesta.

## Risks / Trade-offs

- [Riesgo] Al condensar una descripción se omita una restricción → conservar todos los escenarios existentes y añadir escenarios para fórmulas, precisión y esquema de respuesta.
- [Riesgo] El sincronizador rechace el delta por encabezados o requisitos incompletos → ejecutar `openspec validate --changes --strict --no-interactive` antes de archivar.
- [Riesgo] La reescritura parezca un cambio funcional → comparar la especificación resultante con la anterior y revisar que solo cambia la estructura textual.

## Migration Plan

1. Validar el delta y corregir cualquier error de formato.
2. Aplicar el cambio para actualizar `openspec/specs/news-sentiment-analysis/spec.md`.
3. Ejecutar la validación estricta de especificaciones y la sincronización de contratos.
4. Revisar el diff documental y archivar el cambio cuando todas las verificaciones pasen.
