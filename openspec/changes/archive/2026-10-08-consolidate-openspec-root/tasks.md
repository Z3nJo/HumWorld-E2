# Tasks

## 1. Inventario y preparación de la migración

- [x] 1.1 Inventariar `frontend/openspec/` completo —configuración, especificaciones, cambios archivados y archivos únicos— y verificar que el inventario queda registrado antes de mover nada.
- [x] 1.2 Definir el mapeo de capacidades frontend a `openspec/specs/frontend/<capability>/` y verificar que no existen colisiones de nombres ni referencias relativas inválidas.
- [x] 1.3 Revisar el inventario de cambios archivados y definir nombres destino bajo `openspec/changes/archive/`; verificar que cada cambio conserva su `.openspec.yaml` y sus artefactos.

## 2. Consolidación de artefactos OpenSpec

- [x] 2.1 Migrar las especificaciones frontend a la raíz `openspec/` siguiendo el mapeo aprobado y verificar que cada archivo fuente esperado existe y conserva su contenido.
- [x] 2.2 Migrar los cambios archivados frontend a `openspec/changes/archive/` y verificar el conteo de cambios, metadatos y archivos frente al inventario inicial.
- [x] 2.3 Retirar `frontend/openspec/` solo después de la comparación completa y verificar que `Get-ChildItem -Recurse -Directory -Filter openspec` devuelve únicamente la raíz canónica.

## 3. Documentación y automatización

- [x] 3.1 Actualizar README y documentación operativa para indicar que `openspec/` es la única fuente editable y que `opsx/contracts/` es generado; verificar que las instrucciones no mencionan `frontend/openspec/`.
- [x] 3.2 Añadir una validación que falle si aparece una raíz OpenSpec anidada no autorizada y verificarla con una ejecución positiva y una prueba controlada de detección.
- [x] 3.3 Confirmar que `opsx/sync_contracts.py` continúa leyendo únicamente desde `openspec/specs/` y verificar que no requiere cambios en los contratos generados.

## 4. Validación de integración

- [x] 4.1 Ejecutar `openspec.cmd context --json` desde la raíz y desde `frontend` y verificar que ambos resuelven `HumWorld-E2` como raíz.
- [x] 4.2 Ejecutar `openspec.cmd validate --specs --strict --no-interactive` desde la raíz y verificar que la validación termina correctamente.
- [x] 4.3 Ejecutar `python opsx/sync_contracts.py --check` y verificar que los contratos generados siguen sincronizados.
- [x] 4.4 Revisar el diff final y verificar que no se modificaron código de producto, endpoints, modelos ni comportamiento del frontend.

## Workflow follow-up

- Revisar los artefactos de la propuesta antes de autorizar su aplicación.
- Aplicar el cambio mediante `$openspec-apply-change` cuando se autorice explícitamente.
- Archivar el cambio después de completar y verificar todas las tareas.
