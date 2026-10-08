# Design

## Context

La raíz del repositorio ya es la fuente que usa CI y `opsx/sync_contracts.py`. Sin embargo, `frontend/openspec/` actúa como otra raíz local cuando el CLI se ejecuta desde `frontend/`, y contiene capacidades y cambios archivados que deben preservarse.

## Goals / Non-Goals

**Goals:**

- Tener una única raíz de planificación OpenSpec para todo el monorepo.
- Preservar el contenido histórico y las capacidades frontend existentes.
- Hacer explícita la frontera entre fuente editable (`openspec/`) y salida generada (`opsx/contracts/`).
- Detectar futuras carpetas `openspec` anidadas durante la validación.

**Non-Goals:**

- Cambiar requisitos funcionales del frontend o backend.
- Cambiar la estructura de `src/` del frontend.
- Regenerar o editar manualmente contratos en `opsx/contracts/`.
- Resolver en este cambio otras inconsistencias de arquitectura no relacionadas con OpenSpec.

## Decisions

1. **La raíz canónica será `openspec/` en el repositorio.** Es la alternativa compatible con README, CI y `sync_contracts.py`. Mantener dos raíces exigiría configurar stores, reglas y validaciones separadas y conservaría la ambigüedad.

2. **Las capacidades frontend se agruparán bajo `openspec/specs/frontend/`.** Esto conserva nombres estables y evita colisiones futuras con capacidades backend, sin crear una nueva raíz OpenSpec.

3. **Los cambios archivados frontend se fusionarán en `openspec/changes/archive/`.** Se preservará cada directorio de cambio y su `.openspec.yaml`; si hubiera nombres repetidos, se resolverá con el prefijo de fecha ya utilizado por el archivo histórico.

4. **Se actualizará la documentación y la automatización, no el código de producto.** La validación deberá comprobar que `frontend/openspec/` no existe y que los contratos generados siguen sincronizados desde la raíz.

5. **La migración será verificable antes de retirar la carpeta antigua.** Primero se hará un inventario y comparación de archivos; después se copiarán/moverán los artefactos; finalmente se ejecutarán validación OpenSpec desde raíz y desde `frontend`, la sincronización en modo `--check` y CI local equivalente.

## Risks / Trade-offs

- [Riesgo] Dos capacidades frontend pueden tener referencias relativas o nombres que colisionen → revisar referencias y conservar rutas de capacidad estables bajo `frontend/`.
- [Riesgo] Perder historial al mover cambios archivados → usar movimientos controlados y verificar conteo, nombres y contenido antes de eliminar la raíz antigua.
- [Riesgo] Un agente siga creando `frontend/openspec/` → documentar la regla y añadir una comprobación automatizada.
- [Riesgo] El CLI resuelva una raíz inesperada desde un subdirectorio → validar `openspec context --json` tanto en la raíz como en `frontend`.

## Migration Plan

1. Inventariar especificaciones, cambios archivados, configuraciones y archivos únicos de `frontend/openspec/`.
2. Crear la estructura equivalente bajo la raíz `openspec/`, preservando el contenido y ajustando solo rutas organizativas necesarias.
3. Revisar referencias en README, skills, CI y scripts; dejar `opsx/contracts/` como salida generada.
4. Ejecutar validaciones desde la raíz y desde `frontend`, además de `python opsx/sync_contracts.py --check`.
5. Eliminar `frontend/openspec/` solo después de comprobar que la migración es completa.
6. Si la validación falla, restaurar la carpeta antigua desde el control de versiones y corregir la migración antes de reintentar.
