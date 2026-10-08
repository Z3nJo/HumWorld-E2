# Tasks

## 1. Reestructuración del delta

- [x] 1.1 Revisar el delta de `news-sentiment-analysis` contra la especificación principal y verificar que conserva los cuatro encabezados modificados y todos los escenarios existentes.
- [x] 1.2 Condensar las descripciones normativas a menos de 500 caracteres y expresar fórmulas, precisión, validaciones y campos de API en escenarios verificables; verificar con `openspec validate --changes --strict --no-interactive`.
- [x] 1.3 Comparar el delta con la especificación anterior y verificar que no cambia endpoints, fórmulas, límites, redondeos, persistencia ni comportamiento observable.

## 2. Aplicación y validación

- [x] 2.1 Aplicar la sincronización del delta a `openspec/specs/news-sentiment-analysis/spec.md` y verificar que la especificación principal conserva su propósito y requisitos completos.
- [x] 2.2 Ejecutar `openspec validate --specs --strict --no-interactive` y verificar que no quedan advertencias de longitud ni errores de formato.
- [x] 2.3 Ejecutar `python opsx/sync_contracts.py --check` y verificar que los contratos generados siguen sincronizados.

## Workflow follow-up

- Revisar la especificación sincronizada y el diff documental.
- Archivar este cambio cuando todas las tareas y validaciones pasen.
- Completar después la tarea 4.2 del cambio `consolidate-openspec-root` y archivarlo.
