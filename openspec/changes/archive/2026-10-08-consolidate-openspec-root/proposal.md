# Proposal

## Why

El repositorio tiene dos raíces OpenSpec independientes: `openspec/` y `frontend/openspec/`. Esto hace que el conjunto de contratos visible dependa del directorio desde el que se ejecuta el CLI y contradice la documentación, CI y el script de sincronización, que tratan la raíz del repositorio como fuente de verdad.

La consolidación elimina la ambigüedad antes de que se incorporen más especificaciones frontend y evita que agentes o desarrolladores trabajen contra contratos distintos.

## What Changes

- Mantener `openspec/` en la raíz como única fuente editable de propuestas, especificaciones y tareas.
- Integrar las especificaciones y el historial de cambios de `frontend/openspec/` en la raíz, preservando sus capacidades frontend y cambios archivados.
- Organizar las capacidades frontend bajo rutas explícitas, por ejemplo `specs/frontend/app-shell` y `specs/frontend/dictionary-ui`.
- Eliminar la segunda raíz `frontend/openspec/` después de verificar que no quedan artefactos únicos fuera de la migración.
- Mantener `opsx/contracts/` como copia generada, sin editarla manualmente.
- Actualizar README, instrucciones de contribución y validaciones para indicar la raíz OpenSpec canónica.
- Añadir una comprobación que detecte raíces OpenSpec adicionales dentro del repositorio.

## Capabilities

### New Capabilities

No se introducen capacidades de producto. Este cambio es organizativo y de tooling; se declara `skip_specs: true`.

### Modified Capabilities

No se modifican requisitos funcionales existentes.

## Impact

- Afecta a la organización de `openspec/`, `frontend/openspec/`, la documentación y las validaciones de CI.
- No cambia endpoints, modelos, UI, comportamiento del frontend ni comportamiento del backend.
- Los comandos OpenSpec ejecutados desde cualquier subdirectorio deberán resolver la misma raíz de planificación del repositorio.
- Los contratos generados en `opsx/contracts/` seguirán sincronizándose únicamente desde `openspec/specs/`.
