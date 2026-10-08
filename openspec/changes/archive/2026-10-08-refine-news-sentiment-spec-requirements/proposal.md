# Proposal

## Why

La especificación `news-sentiment-analysis` es válida en contenido, pero cuatro requisitos superan el límite recomendado de longitud que aplica la validación estricta de OpenSpec. Esto impide cerrar la validación del repositorio aunque no exista un defecto funcional.

## What Changes

- Reestructurar los requisitos largos de `news-sentiment-analysis` en formulaciones concisas.
- Mantener exactamente el comportamiento, las fórmulas, las validaciones y los escenarios existentes.
- Trasladar ejemplos y casos límite a escenarios cuando corresponda, sin cambiar el contrato funcional.
- Verificar que `openspec validate --specs --strict --no-interactive` termina correctamente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `news-sentiment-analysis`: se reorganiza la redacción de cuatro requisitos para cumplir la validación estricta, preservando su semántica y escenarios.

## Impact

- Afecta únicamente a `openspec/specs/news-sentiment-analysis/spec.md` mediante la sincronización del delta.
- No cambia código, endpoints, modelos, fórmulas ni comportamiento runtime.
- Desbloquea la validación estricta necesaria para cerrar la migración de la raíz OpenSpec.
