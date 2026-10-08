# ADR-004 — Arquitectura interna del frontend

| Campo | Valor |
|---|---|
| Estado | Propuesto para adopción incremental |
| Fecha | 8 de octubre de 2026 |
| Depende de | ADR-000, ADR-003 |

## Contexto

`ADR-000` define al frontend como la capa de presentación y exige que consuma el backend únicamente mediante `/api/v1`, pero no define su organización interna. El frontend ya contiene funcionalidades implementadas con una estructura histórica (`src/api`, `src/types`, `src/pages`), por lo que una nueva convención debe poder introducirse sin una reescritura global.

## Decisión

Las funcionalidades nuevas se organizarán por funcionalidad bajo `frontend/src/features/<feature>/`. Cada funcionalidad podrá contener, únicamente cuando exista contenido real:

```text
feature/
├── domain/          modelos de pantalla y funciones puras
├── infrastructure/  DTOs, llamadas API y mapeos
├── application/     orquestación, carga y errores
└── presentation/    componentes React, estilos e interacción
```

`app/` contiene arranque, rutas y proveedores generales. `shared/` contiene solo capacidades reutilizadas por dos o más funcionalidades; no es un sustituto de las carpetas de una feature.

La decisión es una separación ligera por funcionalidades, no una implementación completa de Clean Architecture. Mientras exista una única implementación de datos, `application` puede importar directamente funciones de `infrastructure`; no se crean puertos ni inyección de dependencias por defecto.

## Reglas

1. `domain` no importa React, HTTP, DTOs ni librerías visuales.
2. `infrastructure` conoce DTOs y usa exclusivamente `shared/api/httpClient.ts` para HTTP; transforma DTOs a modelos de dominio.
3. `application` coordina infraestructura y estado de la funcionalidad, pero no contiene JSX ni realiza `fetch`.
4. `presentation` no conoce DTOs, rutas HTTP ni reglas de negocio del backend.
5. Una feature no importa directamente otra feature. Lo común se mueve a `shared` solo con dos consumidores reales o una responsabilidad transversal demostrable.
6. Las rutas consumidas se documentan bajo `/api/v1` y deben existir previamente en `/api/docs`.
7. La configuración distingue `VITE_API_URL` de las rutas relativas/proxy `/api` utilizadas por Docker.

## Migración

La estructura existente no se reescribe como prerrequisito. La convención se aplica primero a funcionalidades nuevas. El diccionario se migrará cuando tenga una modificación sustancial, separando API/DTO, dominio, orquestación y presentación, sin cambiar su contrato externo.

## Pruebas y verificación

- Las funciones de dominio y mapeos se prueban con Vitest sin DOM ni red.
- La aplicación puede mockear infraestructura mientras exista una sola implementación.
- Las funcionalidades que cruzan la frontera deben tener una prueba de integración Frontend ↔ API contra el entorno Docker o backend de prueba acordado.
- La revisión verifica que no haya `fetch` fuera del cliente HTTP compartido, DTOs en presentación/aplicación ni imports entre features.

## Consecuencias

Se obtiene un límite claro para el código nuevo y un radio de cambio reducido por funcionalidad. Durante la transición coexistirán la estructura histórica y la normativa; esa coexistencia es deliberada y se controla mediante revisión, lint futuro y migración oportunista.
