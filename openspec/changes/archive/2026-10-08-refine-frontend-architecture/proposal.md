# Proposal

## Why

El ADR-004 propone una organización interna del frontend adecuada para el tamaño y las restricciones de HumWorld, pero necesita ajustar sus reglas a la estructura que ya existe en el repositorio. Sin aclarar la migración, los límites de `shared`, el cliente HTTP y la estrategia de pruebas, el ADR puede convertirse en una norma difícil de aplicar de forma consistente.

Este cambio formaliza una versión implementable del plan antes de seguir incorporando funcionalidades al frontend.

## What Changes

- Refinar ADR-004 para describir una arquitectura por funcionalidades con separación ligera de `domain`, `infrastructure`, `application` y `presentation`.
- Definir una migración progresiva desde la estructura actual del diccionario, sin exigir una reescritura inmediata.
- Precisar la regla del cliente HTTP único, incluyendo la configuración de `VITE_API_URL` y el proxy `/api` de Docker.
- Aclarar que `application` puede depender directamente de `infrastructure` mientras exista una sola implementación, sin presentar esa decisión como Clean Architecture completa.
- Establecer límites para evitar que `shared` se convierta en un cajón de sastre.
- Normalizar en la documentación los endpoints bajo `/api/v1`.
- Definir una estrategia verificable para pruebas unitarias y de integración Frontend ↔ API.
- Mantener el alcance en arquitectura, documentación y reorganización interna; no se modifican contratos de API ni comportamiento funcional.

## Capabilities

### New Capabilities

<!-- No se introduce comportamiento observable nuevo. -->

### Modified Capabilities

<!-- No hay cambios de requisitos de producto; este es un cambio arquitectónico y documental. -->

## Impact

- `docs/adr/ADR-004-arquitectura-interna-frontend.md` o el documento equivalente del ADR-004.
- `frontend/src`, especialmente la integración existente del diccionario en `src/api`, `src/types` y `src/pages/Dictionary`.
- Convenciones de pruebas Vitest/Testing Library y pruebas de integración contra la API.
- Documentación de frontend y Definition of Done, si el equipo adopta los criterios de verificación.
- No se prevén cambios en endpoints, esquemas OpenAPI, backend ni base de datos.
