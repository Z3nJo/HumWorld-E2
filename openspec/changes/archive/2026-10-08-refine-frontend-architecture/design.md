# Design

## Context

El frontend ya contiene una aplicación React/Vite/TypeScript funcional. El diccionario concentra actualmente la comunicación HTTP y el mapeo de respuestas en `src/api/dictionary.ts`, los tipos en `src/types/dictionary.ts` y la orquestación de estado en `src/pages/Dictionary/hooks/useDictionary.ts`. La arquitectura propuesta debe poder adoptarse sin detener el desarrollo ni cambiar el contrato `/api/v1`.

## Goals / Non-Goals

**Goals:**

- Establecer una convención por funcionalidad que sea aplicable a nuevas vistas.
- Separar tipos de dominio de DTOs y detalles HTTP.
- Mantener una única política de acceso a la API y una estrategia de pruebas clara.
- Permitir migración incremental y revisable del código existente.

**Non-Goals:**

- Reescribir inmediatamente el diccionario existente.
- Introducir puertos, repositorios abstractos, contenedores de inyección o clases de casos de uso por defecto.
- Cambiar endpoints, respuestas OpenAPI, reglas de negocio o comportamiento visual.
- Elegir ahora una librería adicional de caché de servidor.

## Decisions

### 1. Organización por funcionalidad

Las funcionalidades nuevas se ubicarán bajo `frontend/src/features/<feature>/`, con `domain`, `infrastructure`, `application` y `presentation` solo cuando cada carpeta tenga contenido real. `app` contendrá arranque, rutas y proveedores; `shared` contendrá únicamente capacidades reutilizadas por dos o más funcionalidades.

Se elige esta organización frente a carpetas globales por tipo porque reduce el radio de cambio de cada historia. No se adopta Feature-Sliced Design completo por su mayor taxonomía para el tamaño actual del proyecto.

### 2. Fronteras y dependencias

- `domain` será TypeScript puro y contendrá modelos de pantalla y transformaciones de presentación.
- `infrastructure` conocerá DTOs, rutas `/api/v1` y el cliente HTTP compartido, y mapeará DTOs a dominio.
- `application` coordinará carga, errores y operaciones de la funcionalidad; podrá importar directamente `infrastructure` mientras exista una única implementación.
- `presentation` contendrá React, JSX, estilos y librerías visuales; no conocerá DTOs ni HTTP.

La documentación describirá esto como arquitectura ligera por funcionalidades, no como Clean Architecture completa, porque `application` no será independiente de `infrastructure` en tiempo de compilación.

### 3. Cliente HTTP y configuración

`shared/api/httpClient.ts` será el único punto que ejecute peticiones y centralice base URL, serialización JSON y errores. La configuración distinguirá explícitamente el uso de `VITE_API_URL` en desarrollo/producción y las rutas relativas/proxy `/api` en Docker. Las funcionalidades solo expondrán funciones de infraestructura específicas, nunca `fetch` desde componentes o hooks de aplicación.

### 4. Pruebas

Las funciones de `domain` y los mapeadores de `infrastructure` se probarán sin DOM ni red. Las pruebas de `application` podrán mockear el módulo de infraestructura inicialmente; si la complejidad o la necesidad de una segunda implementación lo justifican, se extraerá una dependencia inyectable sin convertirla en requisito general. La integración Frontend ↔ API se ejecutará contra el entorno Docker o un backend de prueba acordado, verificando al menos una operación real por funcionalidad.

### 5. Migración incremental

No se moverá el diccionario como un prerrequisito global. Primero se documentará la convención y se aplicará a la siguiente funcionalidad nueva. El diccionario se migrará solo cuando haya una modificación relevante en esa funcionalidad; durante la transición se aceptará la estructura existente, pero no se añadirán nuevas dependencias que profundicen la mezcla de capas.

## Risks / Trade-offs

- [Deriva entre reglas y código] → Añadir revisión de fronteras a los pull requests y evaluar lint de imports si aparecen violaciones repetidas.
- [`shared` se convierte en cajón de sastre] → Exigir dos consumidores reales o una responsabilidad transversal clara antes de mover código allí.
- [Mocks de módulos demasiado acoplados] → Mantener funciones pequeñas y extraer dependencias solo cuando las pruebas lo requieran.
- [DTOs escritos a mano divergen de OpenAPI] → Revisar DTOs contra `/api/docs` y evaluar generación automática cuando el contrato tenga estabilidad suficiente.
- [Migración parcial confunde al equipo] → Documentar qué estructura es normativa para código nuevo y qué excepciones temporales existen.
