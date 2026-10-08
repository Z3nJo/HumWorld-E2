# ADR-004 — Arquitectura interna del frontend: Clean Architecture liviana organizada por funcionalidad

| Campo | Valor |
|---|---|
| **ID** | ADR-004 |
| **Título** | Arquitectura interna del frontend: Clean Architecture liviana organizada por funcionalidad |
| **Estado** | **Propuesto** — pendiente de revisión y acuerdo del equipo |
| **Fecha de redacción** | 8 de octubre de 2026 |
| **Sprint** | Sprint 2 |
| **Autor / responsable** | Matías Santos — Arquitectura y Documentación |
| **Decisores** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Tarea asociada** | **Sin tarea en el plan de carga de Jira** — ver secc. 9, punto 1 |
| **Depende de** | `ADR-000` (arquitectura en tres capas), `ADR-003` (stack tecnológico), `ADR-001` (algoritmo de cálculo del humor, rango del valor mostrado) |
| **Artefactos dependientes** | `E1-H01` (alta de canales y fuentes RSS, vista de administración), `E3-H01` (mapa mundial), `E3-H02` (noticias influyentes), `frontend/README.md` |
| **Plantilla** | MADR extendido — formato común obligatorio para todos los ADR del proyecto |
| **Ubicación** | `docs/adr/ADR-004-arquitectura-interna-frontend.md` (repositorio `HumWorld-E2`) |

> **Relación con ADR-000.** Este ADR **complementa** a `ADR-000`; no lo sustituye ni lo modifica. La arquitectura del sistema sigue siendo de tres capas. Este documento decide únicamente cómo se organiza **por dentro** la capa de presentación, que `ADR-000` dejó sin estructura interna definida.

---

## 1. Contexto y planteamiento del problema

`ADR-000` asigna a la capa de presentación la interfaz web —panel de administración, dashboard de humor, nube de palabras y listado de noticias— y fija lo que esa capa contiene y lo que no debe contener (secc. 4.1). Sin embargo, su estructura de directorios (secc. 4.4) representa `frontend/` como una única carpeta, sin organización interna. `ADR-003` fija el stack (React + Vite + TypeScript, react-simple-maps, Chart.js, d3-cloud, Vitest + Testing Library), pero tampoco define esa organización.

A la fecha de este ADR, `frontend/` contiene únicamente un `Dockerfile` y un `README.md`. Es el momento de menor coste para acordar una estructura: todavía no existe código que migrar.

Sin reglas internas, el riesgo previsible en un frontend React es que los componentes llamen directamente a la API y consuman la forma cruda de sus respuestas. Las consecuencias son concretas:

- Un cambio en el contrato `/api/v1` obliga a modificar componentes visuales dispersos.
- Las pruebas de cualquier lógica requieren renderizar componentes y simular la red.
- Aparece la tentación de recalcular en el navegador reglas que pertenecen al backend (humor, influencia, caducidad), en contra de `ADR-000`, secc. 4.1.

El problema a resolver es:

> ¿Cómo se organiza internamente la capa de presentación para que el contrato con la API quede aislado, la lógica de la vista sea testeable sin renderizar y la estructura sea sostenible por un único responsable de frontend?

### 1.1 Restricciones de partida (no negociables)

| # | Restricción | Origen |
|---|---|---|
| C-1 | La presentación no contiene reglas de negocio (cálculo o normalización del humor, criterio de noticia influyente, lógica de caducidad) ni accede a la base de datos. | `ADR-000`, secc. 4.1 |
| C-2 | El único punto de entrada de la presentación al sistema es la API REST bajo `/api/v1`. | `ADR-000`, regla R-2 |
| C-3 | El contrato entre presentación y lógica de negocio es el documento OpenAPI de `/api/docs`, generado desde el código. | `ADR-000`, regla R-5; `ADR-003`, regla S-1 |
| C-4 | El frontend no consume ningún endpoint que no esté previamente publicado en `/api/docs`. | Definition of Done v1.0, criterio 13 |
| C-5 | Stack de frontend: React + Vite + TypeScript; pruebas con Vitest + Testing Library. | `ADR-003`, secc. 4 |
| C-6 | Deben existir pruebas de integración Frontend ↔ API. | Especificación, secc. 7; `ADR-000`, criterio C-V5 |

### 1.2 Alcance de este ADR

**Incluye:** la estructura de directorios de `frontend/src`, la definición de las capas internas, las reglas de dependencia entre ellas y los criterios de verificación.

**No incluye (se difiere explícitamente):**

- La librería de enrutado y la estrategia de gestión de estado del servidor (ver secc. 9, punto 2).
- La generación automática de tipos TypeScript desde el documento OpenAPI (ver secc. 9, punto 3).
- El sistema de diseño visual (tipografía, paleta, componentes de interfaz).
- Los umbrales visuales definitivos de la escala de humor, que se fijan con el diseño de `E3-H01`.

---

## 2. Drivers de la decisión

| # | Driver | Origen |
|---|---|---|
| F-A | **Conformidad con `ADR-000`**: la estructura debe hacer visible y verificable que la presentación no contiene reglas de negocio ni otra puerta de entrada que `/api/v1`. | `ADR-000`, secc. 4.1 y R-2 |
| F-B | **Aislamiento del contrato**: un cambio en `/api/v1` debe afectar a un único punto por funcionalidad, no a componentes visuales dispersos. | `ADR-000`, R-5; `ADR-003`, S-1 |
| F-C | **Testabilidad**: la lógica de la vista (transformaciones, orquestación de llamadas) debe probarse con Vitest sin renderizar componentes. | Especificación, secc. 7 |
| F-D | **Capacidad del equipo**: el frontend tiene un único responsable, con un factor de capacidad efectiva de 0,6. La estructura no puede exigir más ceremonia de la que una persona sostiene. | Planificación de Sprints v2, secc. 1; `ADR-003`, driver D-5 |
| F-E | **Contexto estable para IA**: reglas explícitas evitan que el código generado por IA introduzca decisiones estructurales propias. | `ADR-000`, driver D-F |
| F-F | **Objetivo formativo**: aplicar los principios de Clean Architecture (regla de dependencia hacia el interior) en el frontend. | Propuesta del autor — ver secc. 9, punto 5 |

---

## 3. Opciones consideradas

### Opción 1 — Estructura plana por tipo de archivo

Carpetas `components/`, `pages/`, `services/` y `hooks/` sin reglas de dependencia.

- **A favor:** coste inicial nulo; es la estructura por defecto de muchas plantillas de Vite.
- **En contra:** no impide que un componente llame a la API ni que consuma la forma cruda de las respuestas (F-B); agrupa por tipo técnico y no por funcionalidad, por lo que cada historia toca varias carpetas; las reglas dependen solo de disciplina individual. **Descartada por no satisfacer F-A ni F-B.**

### Opción 2 — Clean Architecture completa

Entidades, casos de uso como clases, puertos (interfaces) para todo acceso externo, adaptadores que los implementan e inyección de dependencias.

- **A favor:** máxima independencia del framework y de la API; aplicación literal del modelo.
- **En contra:** su valor principal es proteger lógica de negocio, y en HumWorld esa lógica vive en el backend (`ADR-000`, R-4; `ADR-003`, S-2). En el frontend generaría casos de uso y puertos que se limitan a reenviar una llamada a un endpoint. Cada interfaz tendría una sola implementación. Es el mismo sobrecoste conceptual por el que `ADR-000` descartó la arquitectura hexagonal para el sistema (Opción 4), y compite con la capacidad de una sola persona (F-D). **Descartada por desproporción coste/beneficio.**

### Opción 3 — Feature-Sliced Design

Metodología con capas estandarizadas (`app`, `pages`, `widgets`, `features`, `entities`, `shared`) y reglas de importación entre ellas.

- **A favor:** convención documentada externamente, con herramientas de lint propias.
- **En contra:** introduce una taxonomía propia de seis capas que el equipo tendría que aprender, y su distinción entre `widgets`, `features` y `entities` exige decisiones de clasificación frecuentes para un proyecto con seis vistas. **Descartada por curva de aprendizaje frente a F-D.**

### Opción 4 — Clean Architecture liviana organizada por funcionalidad *(elegida)*

Una carpeta por funcionalidad de la especificación y, dentro de cada una, cuatro capas internas (`domain`, `infrastructure`, `application`, `presentation`) con la regla de dependencia hacia el interior. **Sin puertos ni inyección de dependencias por defecto.**

- **A favor:** conserva el principio central de Clean Architecture —el dominio no depende de nada y los detalles (React, HTTP) quedan en los bordes— sin la ceremonia de la Opción 2. Aísla el contrato de la API en un único punto por funcionalidad (F-B). La organización por funcionalidad hace que cada historia de usuario toque una sola carpeta.
- **En contra:** más archivos que la Opción 1; requiere revisión en *pull request* para que las reglas no se erosionen; sin puertos, la capa `application` depende directamente de `infrastructure` (ver regla F-7 y su justificación).

---

## 4. Decisión

**Se adopta la Opción 4: la capa de presentación de HumWorld se organiza por funcionalidad y, dentro de cada funcionalidad, en cuatro capas internas con dependencias dirigidas hacia el dominio.**

### 4.1 Estructura de directorios adoptada

```
frontend/src/
├── app/                      # Arranque: enrutado, proveedores, layout general
├── shared/
│   ├── api/
│   │   └── httpClient.ts     # Única puerta HTTP hacia /api/v1: base URL, JSON, errores
│   └── ui/                   # Componentes visuales reutilizables sin lógica de dominio
└── features/
    ├── sources/              # Panel de administración: canales y fuentes RSS
    ├── dictionary/           # Panel de administración: diccionario de términos
    ├── config/               # Panel de administración: parámetros de cron y caducidad
    ├── humor-dashboard/      # Dashboard de humor: mapa mundial por continente
    ├── word-cloud/           # Nube de palabras con filtros
    └── news/                 # Listado de noticias influyentes
        ├── domain/
        ├── infrastructure/
        ├── application/
        └── presentation/
```

Cada carpeta de `features/` replica las cuatro subcarpetas. Una subcarpeta vacía no se crea hasta que tenga contenido.

### 4.2 Definición de las capas internas

| Capa interna | Responsabilidad | Contiene | No debe contener |
|---|---|---|---|
| **domain** | Modelo de la funcionalidad tal como lo usa la interfaz. | Tipos TypeScript del dominio (por ejemplo `ContinentHumor`, `Source`), funciones puras de presentación de datos (clasificación visual de un valor de humor, formato de fechas). | Imports de React, `fetch`, `httpClient` o tipos del contrato de la API (DTO). Reglas de negocio del backend (C-1). |
| **infrastructure** | Comunicación con la API. | Funciones que llaman a `/api/v1` a través de `shared/api/httpClient.ts`, tipos DTO del contrato y su mapeo a tipos de `domain`. | Componentes, hooks de React, estado de la interfaz. |
| **application** | Orquestación de la funcionalidad. | Hooks o funciones que coordinan llamadas de `infrastructure`, estado de carga y error, y combinación de datos para una vista. | JSX, estilos, llamadas directas a `httpClient` o `fetch`. |
| **presentation** | Renderizado e interacción. | Componentes y vistas React, formularios, integración con react-simple-maps, Chart.js y d3-cloud. | Llamadas a la API, tipos DTO, transformaciones de datos que no sean de renderizado. |

### 4.3 Reglas de dependencia (normativas)

- **F-1 — Dirección hacia el dominio.** Las dependencias permitidas son:
  - `domain` → ninguna.
  - `infrastructure` → `domain`, `shared/api`.
  - `application` → `domain`, `infrastructure`.
  - `presentation` → `application`, `domain`, `shared/ui`.

  Ninguna otra dirección está permitida.
- **F-2 — Dominio puro.** `domain` no importa React, librerías de visualización, `httpClient` ni tipos DTO. Todo su contenido es ejecutable en una prueba unitaria sin DOM ni red.
- **F-3 — Única puerta HTTP.** Solo `shared/api/httpClient.ts` conoce la base URL `/api/v1` y realiza peticiones, y solo las capas `infrastructure` lo importan. Es la regla R-2 de `ADR-000` expresada en el frontend.
- **F-4 — Los DTO no salen de infrastructure.** Los tipos que reflejan el contrato de la API se transforman en tipos de `domain` dentro de `infrastructure`. `application` y `presentation` nunca reciben la forma cruda de una respuesta. Un cambio de contrato se absorbe en un único archivo por funcionalidad.
- **F-5 — Sin reglas de negocio del backend.** El frontend no recalcula el humor, no decide qué noticia es influyente ni aplica caducidades. Muestra los valores que entrega la API. Las únicas reglas admitidas en `domain` son de presentación: cómo clasificar visualmente un valor, cómo formatearlo o cómo ordenarlo en pantalla.
- **F-6 — Aislamiento entre funcionalidades.** Una carpeta de `features/` no importa archivos de otra. Lo que necesiten dos o más funcionalidades se traslada a `shared/`.
- **F-7 — Sin puertos por defecto.** `application` importa directamente las funciones de `infrastructure`. No se crean interfaces ni mecanismos de inyección de dependencias mientras exista una única implementación; las pruebas sustituyen `infrastructure` con `vi.mock` de Vitest. Se introduce un puerto, mediante revisión de este ADR, solo cuando aparezca una segunda implementación real (por ejemplo, una fuente de datos alternativa a la API).

### 4.4 Mapeo de funcionalidades a vistas y endpoints

Los endpoints se indican tal como los nombra `ADR-000`, secc. 4.3. Los nombres definitivos son los publicados en `/api/docs` (C-4).

| Funcionalidad (`features/`) | Vista de la especificación | Endpoints que consume |
|---|---|---|
| `sources` | Panel de administración — canales y fuentes RSS | `/sources` |
| `dictionary` | Panel de administración — diccionario de términos | `/dictionary` |
| `config` | Panel de administración — parámetros generales | `GET`/`PUT /config` |
| `humor-dashboard` | Dashboard de humor — mapa mundial con selector de fecha | `/dashboards` |
| `word-cloud` | Nube de palabras con filtros | `/dashboards` |
| `news` | Listado de noticias influyentes | Pendiente de `ADR-002` |

Las acciones manuales de captura y borrado (`ADR-000`, secc. 4.3) se ubican en la funcionalidad cuya vista las presenta, una vez publicado su endpoint.

### 4.5 Ejemplo de referencia

Ejemplo ilustrativo del recorrido completo en `humor-dashboard`. Los umbrales de clasificación **no son normativos**: se fijan con el diseño de `E3-H01`. El valor de humor llega normalizado a [-1, 1] según `ADR-001`.

```ts
// features/humor-dashboard/domain/humor.ts
export type ContinentHumor = { continent: string; value: number };
export type HumorLevel = "positive" | "neutral" | "negative";

export const humorLevel = (value: number): HumorLevel =>
  value > 0.2 ? "positive" : value < -0.2 ? "negative" : "neutral";

// features/humor-dashboard/infrastructure/humorApi.ts
import { http } from "@/shared/api/httpClient";
import type { ContinentHumor } from "../domain/humor";

type HumorByContinentDto = { continente: string; humor: number };

export const fetchHumorByContinent = async (date: string): Promise<ContinentHumor[]> => {
  const rows = await http.get<HumorByContinentDto[]>(`/dashboards/humor?date=${date}`);
  return rows.map((row) => ({ continent: row.continente, value: row.humor }));
};

// features/humor-dashboard/application/useHumorByContinent.ts
// Orquesta fetchHumorByContinent: estado de carga, error y datos para la vista.

// features/humor-dashboard/presentation/HumorMap.tsx
// Usa useHumorByContinent y humorLevel; no conoce la API ni el DTO.
```

---

## 5. Consecuencias

### 5.1 Positivas

- La conformidad con `ADR-000` en el frontend pasa a ser verificable por ubicación de archivos: un `fetch` fuera de `shared/api` o un DTO en `presentation` se detecta en revisión sin analizar la lógica.
- Un cambio en el contrato `/api/v1` se absorbe en `infrastructure` de la funcionalidad afectada (F-4).
- `domain` y `application` se prueban con Vitest sin renderizar componentes ni levantar red, lo que reduce el coste de las pruebas unitarias del frontend.
- Cada historia de usuario con interfaz se concentra en una carpeta de `features/`, lo que facilita la revisión de *pull requests* y la asignación de trabajo.
- Las herramientas de IA reciben reglas explícitas de ubicación y dependencia (F-E).

### 5.2 Negativas y costes asumidos

- Más archivos por funcionalidad que en una estructura plana: una vista mínima requiere al menos un archivo en `infrastructure`, uno en `application` y uno en `presentation`.
- Código de mapeo DTO → dominio en cada funcionalidad, incluso cuando ambos tipos coinciden.
- Sin puertos (F-7), `application` no es independiente de `infrastructure` en tiempo de compilación. Se acepta porque `vi.mock` cubre la necesidad de sustitución en pruebas y porque introducir interfaces con una sola implementación contradice F-D.

### 5.3 Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | Erosión de las reglas bajo presión de plazo (llamadas a la API desde componentes, imports entre funcionalidades). | Medio | Criterios CF-V1 a CF-V4 en revisión de *pull request*. Si la erosión se repite, incorporar lint de fronteras (secc. 9, punto 4). |
| R-2 | Lógica de negocio del backend reimplementada en `domain` (por ejemplo, recalcular el humor de un continente a partir de noticias). | Alto: duplica y puede contradecir `ADR-001` | Regla F-5 y criterio CF-V3. Toda agregación necesaria se solicita como endpoint al backend. |
| R-3 | Sobreingeniería: creación de puertos, clases de casos de uso o capas vacías "por si acaso". | Medio: consume la capacidad del único responsable de frontend | Regla F-7 y nota de la secc. 4.1 sobre subcarpetas vacías. |
| R-4 | Divergencia entre los tipos DTO escritos a mano y el documento OpenAPI. | Medio | Revisión contra `/api/docs` en cada *pull request* (C-4). Evaluar generación automática de tipos (secc. 9, punto 3). |

---

## 6. Cumplimiento y verificación

| # | Criterio verificable | Momento / mecanismo |
|---|---|---|
| CF-V1 | Ningún archivo fuera de `shared/api/` realiza peticiones HTTP ni contiene la base URL `/api/v1`. | Revisión de *pull request* |
| CF-V2 | Ningún archivo de `presentation/` o `application/` importa tipos DTO ni `httpClient`. | Revisión de *pull request* |
| CF-V3 | `domain/` no importa React ni librerías externas, y no contiene reglas de negocio del backend (F-5). | Revisión de *pull request* |
| CF-V4 | Ninguna carpeta de `features/` importa archivos de otra carpeta de `features/`. | Revisión de *pull request* |
| CF-V5 | Las funciones de `domain/` y los mapeos de `infrastructure/` tienen pruebas unitarias en Vitest que se ejecutan sin DOM ni red. | Pipeline CI |
| CF-V6 | Existen pruebas de integración Frontend ↔ API. | Pipeline CI (`ADR-000`, criterio C-V5) |

Se propone incorporar CF-V1 a CF-V4 a la secc. 2.2 de la Definition of Done mediante una revisión acordada por el equipo (ver secc. 7).

---

## 7. Relación con ADR-000 e impacto sobre artefactos existentes

**Relación con `ADR-000`.** `ADR-000` descartó la arquitectura hexagonal **para el sistema** por sobrecoste conceptual (Opción 4). Este ADR no la reintroduce: no hay puertos ni adaptadores intercambiables (F-7), y la decisión queda confinada a la capa de presentación. Las reglas R-1 a R-6 no se modifican; F-3 y F-5 son su concreción dentro del frontend.

| Artefacto | Acción requerida | Responsable |
|---|---|---|
| `frontend/README.md` | Describir la estructura de la secc. 4.1 y enlazar este ADR al crear la primera funcionalidad | Sebastián Márquez |
| `docs/definition-of-done.md` | Evaluar la incorporación de CF-V1 a CF-V4 a la secc. 2.2, previo acuerdo del equipo | Matías Santos |
| `README.md` | Añadir este ADR a la tabla de documentación | Matías Santos |
| Tablero HUM (Jira) | Crear el ítem `ADR-004` dentro de la épica correspondiente | Matías Santos |

---

## 8. Trazabilidad

| Elemento de este ADR | Origen |
|---|---|
| Frontend como capa de presentación, sin reglas de negocio ni acceso a datos | `ADR-000`, secc. 4.1 |
| Única puerta de entrada `/api/v1` | `ADR-000`, regla R-2 |
| Contrato OpenAPI generado desde el código | `ADR-000`, regla R-5; `ADR-003`, regla S-1 |
| Stack de frontend y herramientas de prueba | `ADR-003`, secc. 4 |
| Rango [-1, 1] del valor de humor mostrado | `ADR-001` |
| Vistas del frontend | Especificación, secc. 4.3; `frontend/README.md` |
| Endpoints por funcionalidad | `ADR-000`, secc. 4.3 |
| Consumo exclusivo de endpoints publicados | Definition of Done v1.0, criterio 13 |
| Pruebas de integración Frontend ↔ API | Especificación, secc. 7; `ADR-000`, criterio C-V5 |
| Capacidad del equipo | Planificación de Sprints v2, secc. 1 |
| Estructura, reglas F-1 a F-7 y criterios CF-V1 a CF-V6 | **Decisión propuesta en este ADR** (no derivada literalmente de las fuentes) |

---

## 9. Supuestos y puntos abiertos

1. **Punto abierto — este ADR no tiene tarea en Jira.** Debe crearse el ítem correspondiente en el tablero HUM y registrarse en el seguimiento del sprint, como se hizo con `ADR-003`.
2. **Punto abierto.** La librería de enrutado y la estrategia de gestión del estado del servidor (estado local en hooks frente a una librería de caché de peticiones) no están decididas. Se resuelven al implementar la primera vista; si la elección afecta a las reglas de la secc. 4.3, se revisa este ADR.
3. **Punto abierto.** La generación automática de tipos TypeScript desde el documento OpenAPI se difiere hasta que el contrato `/api/v1` esté estable. Si se adopta, los tipos generados se consumen únicamente en `infrastructure` (F-4).
4. **Punto abierto.** El lint automático de fronteras entre capas se difiere. Se incorpora si la revisión de *pull requests* detecta violaciones recurrentes de F-1, F-3 o F-6 (riesgo R-1).
5. **Supuesto.** El driver F-F (objetivo formativo) proviene de la propuesta del autor. Debe confirmarse en la revisión si corresponde a un contenido exigido por la asignatura, en cuyo caso se añade la referencia correspondiente.
6. **Dependencia hacia adelante.** La funcionalidad `news` depende del criterio de noticia influyente de `ADR-002`.

---

## 10. Referencias

1. Especificación del Proyecto Final **HumWorld — ¿De qué humor está el mundo?**, Universidad Andrés Bello, curso 2026-27 (secc. 4.3, 6.1, 7, 10.1, 10.3).
2. **ADR-000 — Arquitectura en tres capas**, secc. 3 (Opción 4), 4.1, 4.2, 4.3 y 6.
3. **ADR-001 — Algoritmo de cálculo del humor**.
4. **ADR-003 — Selección del stack tecnológico**, secc. 2, 4 y 4.1.
5. **Definition of Done v1.0**, secc. 2.2.
6. **Planificación de Sprints HumWorld v2**, secc. 1.

---

## 11. Historial de revisiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 0.1 | 2026-10-08 | Matías Santos | Redacción inicial. Estado: Propuesto, pendiente de revisión por el equipo. |
