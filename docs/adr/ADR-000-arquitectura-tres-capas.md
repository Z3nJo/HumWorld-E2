# ADR-000 — Arquitectura en tres capas (presentación, lógica de negocio y datos)

| Campo | Valor |
|---|---|
| **ID** | ADR-000 |
| **Título** | Arquitectura en tres capas: presentación, lógica de negocio y datos |
| **Estado** | **Aceptado** — acordado por el equipo el 25 de agosto de 2026 |
| **Fecha de redacción** | 25 de agosto de 2026 |
| **Fecha de aprobación** | 25 de agosto de 2026 |
| **Sprint** | Sprint 0 |
| **Autor / responsable** | Matías Santos — Arquitectura y Documentación |
| **Decisores** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Tarea asociada** | `ADR-000`, épica `EP-0`, 2 puntos de historia |
| **Artefactos dependientes** | `INFRA-02` (Docker base), `MOD-01` (modelo E/R inicial), `SWG-00` (Swagger/OpenAPI y convenciones `/api/v1`), `E1-H01` (alta de canales y fuentes RSS) |
| **Plantilla** | MADR extendido — formato común obligatorio para todos los ADR del proyecto |
| **Ubicación** | `docs/adr/ADR-000-arquitectura-tres-capas.md` (repositorio `HumWorld-E2`) |
| **Sustituye a** | `docs/adr/ADR-000-arquitectura-en-capas.md` (versión breve inicial, archivada en `docs/adr/archivo/`) |

> **Criterio de finalización aplicable (Planificación de Sprints v2, tabla detallada, fila S0/ADR-000):** *"ADR redactado, revisado por el equipo y publicado en `/docs`"*.
>
> **Aprobación.** Los cuatro integrantes acordaron esta decisión de forma **verbal**, en la Daily del 25 de agosto de 2026. No se recogió confirmación individual por escrito; Matías Santos, como autor y responsable de documentación, deja constancia del acuerdo. Cualquier integrante que no se reconozca en este registro debe indicarlo en la revisión del *pull request* correspondiente o en la retrospectiva del Sprint 1. Mismo mecanismo y misma sesión en que se acordaron la Definition of Done v1.0 y el `ADR-003`.

---

## 1. Contexto y planteamiento del problema

HumWorld es una aplicación que captura noticias desde fuentes RSS, les asigna un valor de "humor" mediante un algoritmo de análisis de sentimiento, persiste los resultados con sus metadatos y los expone en dashboards interactivos y en una API REST completa (Especificación HumWorld, secc. 4.1).

El Sprint 0 tiene como objetivo *"dejar operativo el entorno técnico, de gestión y de calidad del proyecto para poder desarrollar historias funcionales desde el Sprint 1"* (Planificación de Sprints v2, secc. 3). Dentro de ese sprint, la primera tarea sin dependencias es `ADR-000`, y de ella dependen `INFRA-02`, `MOD-01`, `SWG-00` y, ya en Sprint 1, `E1-H01` (Plan de carga Jira, tabla de dependencias). Es decir: **la organización interna del código y del repositorio no puede definirse mientras esta decisión no esté tomada y documentada**, lo que la convierte en un bloqueante del Sprint 0.

El problema a resolver es, por tanto:

> ¿Qué estilo arquitectónico adopta HumWorld para organizar sus responsabilidades internas, y bajo qué reglas se relacionan sus partes, de modo que se cumplan las exigencias no funcionales de la especificación y el trabajo pueda repartirse entre cuatro integrantes con roles diferenciados?

La especificación no deja este punto totalmente abierto: fija de manera **obligatoria** los elementos arquitecturales con los que el sistema debe contar y la estructura en capas, aunque **no impone** lenguaje, plataforma ni tecnología (Especificación HumWorld, secc. 4.6 (párrafo final, a continuación de 4.6.3) y secc. 6.1).

### 1.1 Restricciones de partida (no negociables)

| # | Restricción | Fuente |
|---|---|---|
| C-01 | La arquitectura será modular, con separación clara entre capas (datos, lógica, presentación). | Especificación, secc. 4.6.2 |
| C-02 | La aplicación se estructurará en tres capas bien diferenciadas: presentación, lógica de negocio y datos. | Especificación, secc. 6.1 |
| C-03 | El sistema debe contar con: un sistema gestor de datos, una capa de lógica de negocio, una capa de visualización y un API REST con endpoints para todas las funciones CRUD de las entidades y para funciones especiales. | Especificación, secc. 4.6 (párrafo final, tras 4.6.3) |
| C-04 | La aplicación dispondrá de interfaz web **y** API REST completa, documentada con Swagger/OpenAPI en `/api/docs`, con base URL `/api/v1` y formato JSON. | Especificación, secc. 3 (Alcance, punto 4), 10.1 y 10.3 |
| C-05 | Deben existir pruebas de integración que verifiquen la interacción **entre capas** (API ↔ base de datos, Frontend ↔ API). | Especificación, secc. 7 |
| C-06 | Cobertura mínima de pruebas unitarias del 80 % por módulo (captura, análisis, purgado, etc.). | Especificación, secc. 7 |
| C-07 | Las decisiones de arquitectura se documentan en ficheros ADR dentro de `/docs`. | Especificación, secc. 4.7 (punto 4); P4 — La Fábrica de Software |
| C-08 | Todos los ADR del proyecto deben usar siempre el mismo formato. | P2 — Agentes, Paso 3 |
| C-09 | No se implementará autenticación ni autorización en esta fase. | Especificación, secc. 3 (Limitaciones, punto 3); Backlog Definitivo R-03; Planificación v2, D-07 |
| C-10 | No se permite web scraping: la única entrada de información son fuentes RSS. | Especificación, secc. 3 (Alcance, punto 1) y 4.2.1; Planificación v2, D-12 |

### 1.2 Alcance de este ADR

**Incluye:** el estilo arquitectónico, la definición normativa de cada capa, las reglas de dependencia entre capas, el mapeo de las funcionalidades de HumWorld a cada capa y la estructura de directorios del repositorio.

**No incluye (se difiere explícitamente):**

- La elección concreta del stack tecnológico (lenguaje, framework de backend, framework de frontend y motor de base de datos) → **`ADR-003`**, acordado el 25 de agosto de 2026. Ver secc. 7.
- El algoritmo de cálculo del humor → **ADR-001** (Planificación v2, D-02 a D-04).
- El criterio de "noticia influyente" → **ADR-002** (Planificación v2, D-05 y D-06).
- El modelo de datos detallado → tarea `MOD-01`, que **depende** de este ADR.

---

## 2. Drivers de la decisión

| # | Driver | Origen |
|---|---|---|
| D-A | **Cumplimiento normativo de la especificación**: la separación en tres capas es un requisito explícito, no una preferencia del equipo. | Especificación, secc. 4.6.2 y 6.1 (C-01, C-02) |
| D-B | **Mantenibilidad y calidad del código**, evaluables con análisis estático (SonarQube recomendado). | Especificación, secc. 4.6.2 |
| D-C | **Testabilidad**: la exigencia de 80 % de cobertura unitaria por módulo y de pruebas de integración entre capas obliga a que la lógica de negocio sea ejecutable sin interfaz web y sin base de datos real. | Especificación, secc. 7 (C-05, C-06) |
| D-D | **Paralelización del trabajo entre roles**: el equipo tiene un responsable de Backend, uno de Frontend, uno de DevOps y Calidad y uno de Arquitectura y Documentación; se necesita un contrato estable entre frontend y backend para que trabajen en paralelo. | Planificación v2, secc. 1.1; Especificación, secc. 8.2 |
| D-E | **Capacidad real del equipo**: 8 horas-persona brutas por día con un factor de disponibilidad efectiva de 0,6; la complejidad arquitectónica compite directamente con la entrega funcional. | Planificación v2, secc. 1.2 y 1.3 |
| D-F | **Trazabilidad y explicabilidad ante el uso de IA**: la arquitectura documentada actúa como contexto estable para las herramientas de generación de código (OpenSpec, Copilot, Claude Code) y evita que la IA introduzca decisiones estructurales por su cuenta. | Especificación, secc. 2 (objetivo específico 5) y 6.2; Material SDD (Ebook SDD 2026, "Arquitectura · Estructura de capas, módulos, responsabilidades") |
| D-G | **Correspondencia con la unidad de aprendizaje**: la Unidad 6 del Syllabus exige "seleccionar estilo arquitectónico para el proyecto final" entre Capas, Serviced Based, Microservicios y Bus, aplicando principios de modularidad, cohesión y acoplamiento. | Syllabus, Unidad 6 (semanas 7–9) |

---

## 3. Opciones consideradas

Las opciones evaluadas corresponden a los estilos arquitectónicos que el Syllabus presenta en la Unidad 6, más la alternativa degenerada de no separar responsabilidades.

### Opción 1 — Arquitectura en tres capas (layered / n-tier)

Presentación, lógica de negocio y datos como capas separadas, con dependencias unidireccionales de arriba hacia abajo.

- **A favor:** es literalmente lo que exige la especificación (secc. 6.1); coste de aprendizaje y de implementación bajo; permite dividir el trabajo entre Backend y Frontend con la API REST como frontera; hace directamente verificables las pruebas de integración "entre capas" que pide la secc. 7; el análisis estático detecta con facilidad las violaciones de capa.
- **En contra:** riesgo de "capa anémica" (lógica que se filtra a controladores o a consultas); el despliegue sigue siendo monolítico, con escalado conjunto; sin disciplina de revisión, la separación puede degradarse a puramente nominal.

### Opción 2 — Monolito sin separación de capas (acceso a datos desde los controladores)

Los endpoints REST consultan la base de datos y calculan el humor en el mismo módulo.

- **A favor:** el menor esfuerzo inicial; menos ficheros y menos indirección.
- **En contra:** **incumple C-01, C-02 y C-03**, que son requisitos obligatorios; imposibilita probar el motor de sentimiento y el purgado de forma unitaria sin base de datos, comprometiendo el 80 % de cobertura; genera deuda técnica que la revisión de calidad detectaría. **Descartada por incumplimiento normativo.**

### Opción 3 — Microservicios

Servicios independientes y desplegables por separado (captura, sentimiento, dashboards, configuración).

- **A favor:** escalado y despliegue independientes; aislamiento de fallos entre el cron de captura y la API de consulta.
- **En contra:** exige infraestructura de comunicación, observabilidad y datos distribuidos que el equipo no tiene planificada ni presupuestada en capacidad (D-E); el material de la asignatura advierte expresamente sobre "microservicios y otros patrones de arquitectura compleja y distribuida" como fuente de complejidad (Clases, 03 Fundamentos); la especificación no pide despliegue distribuido, sino un empaquetado Docker de la aplicación (secc. 6.2). **Descartada por desproporción coste/beneficio.**

### Opción 4 — Arquitectura hexagonal (puertos y adaptadores)

El dominio en el centro, con adaptadores de entrada (REST, cron) y de salida (persistencia, RSS).

- **A favor:** máxima testabilidad e independencia tecnológica del dominio; encajaría bien con el hecho de que el stack aún no está decidido.
- **En contra:** no es uno de los estilos que la especificación nombra ni que el Syllabus exige seleccionar; añade vocabulario y estructura que los cuatro integrantes deberían asimilar en Sprint 0, en paralelo a Docker, CI/CD y OpenSpec; el beneficio principal (intercambiar adaptadores) no se materializa en un proyecto de un solo trimestre. **Descartada por sobrecoste conceptual, pero se toman prestados dos de sus principios** (ver decisión, reglas R-3 y R-4).

---

## 4. Decisión

**Se adopta la Opción 1: HumWorld se estructura como una arquitectura en tres capas —presentación, lógica de negocio y datos— con dependencias unidireccionales descendentes y sin saltos de capa.**

La decisión ejecuta lo prescrito por la especificación (secc. 4.6.2 y 6.1). Lo que este ADR aporta y que **no** proviene de la especificación son las reglas normativas de las secciones 4.2 y 4.3, adoptadas como decisión del equipo para que la separación sea verificable y no meramente declarativa.

### 4.1 Definición de las capas

| Capa | Responsabilidad | Contiene | No debe contener |
|---|---|---|---|
| **Presentación** | Interfaz web para la visualización de dashboards y la gestión de configuraciones (Especificación, secc. 6.1). Incluye las cuatro vistas de la secc. 4.3: panel de administración, dashboard de humor, nube de palabras y listado de noticias. | Componentes de interfaz, enrutado de vistas, gráficos y mapas interactivos, formularios de gestión, cliente HTTP hacia la API. | Reglas de negocio (cálculo o normalización del humor, criterio de noticia influyente, lógica de caducidad), acceso directo a la base de datos, consultas SQL o del gestor documental. |
| **Lógica de negocio** | Implementación de los algoritmos de captura, procesamiento, análisis de sentimiento y purgado (Especificación, secc. 6.1). Expone sus casos de uso a través de la API REST bajo `/api/v1`. | Servicios de dominio, validaciones, orquestación del cron de captura, motor de análisis de sentimiento, agregación por continente y país, purgado por caducidad, resolución de parámetros de `/config`, serialización de contratos de la API. | Sentencias de acceso al gestor de datos escritas directamente en los servicios; código de presentación o de renderizado; supuestos sobre el framework de frontend. |
| **Datos** | Gestión de la persistencia (Especificación, secc. 6.1): almacenamiento y recuperación de las entidades del sistema. | Definición del esquema o de los modelos, repositorios de acceso a datos, migraciones, *seed* de carga inicial de fuentes por continente, índices y consultas de agregación. | Reglas de negocio; conocimiento de HTTP, de códigos de respuesta o del formato de la API. |

### 4.2 Reglas de dependencia (normativas)

- **R-1 — Dirección única.** Presentación → Lógica de negocio → Datos. Ninguna capa referencia a una capa superior.
- **R-2 — Sin saltos de capa.** La capa de presentación **no accede nunca** a la capa de datos. Su único punto de entrada al sistema es la API REST bajo `/api/v1` (Especificación, secc. 10.3).
- **R-3 — Acceso a datos encapsulado.** La lógica de negocio no ejecuta consultas contra el gestor de datos: opera exclusivamente a través de los módulos de repositorio de la capa de datos. *(Principio tomado de la Opción 4.)*
- **R-4 — Dominio aislable.** El motor de análisis de sentimiento y las funciones de agregación deben poder ejecutarse en pruebas unitarias recibiendo datos en memoria, sin base de datos ni servidor HTTP levantados. Es la condición que hace alcanzable el 80 % de cobertura exigido (Especificación, secc. 7).
- **R-5 — Una sola definición de contrato.** El contrato entre presentación y lógica de negocio es el documento OpenAPI publicado en `/api/docs`; toda incorporación o cambio de endpoint se refleja allí antes de consumirse desde el frontend (Especificación, secc. 10.1; tarea `SWG-00`).
- **R-6 — Entrada única de información externa.** La lectura de fuentes RSS es responsabilidad exclusiva de la capa de lógica de negocio; ni la presentación ni la capa de datos consultan fuentes externas (coherente con C-10).

### 4.3 Mapeo de las funcionalidades de HumWorld a las capas

| Funcionalidad (Especificación) | Presentación | Lógica de negocio | Datos |
|---|---|---|---|
| Alta de canales y fuentes RSS con categoría IPTC (4.2.1) | Formularios de alta y listado en el panel de administración | Validación, categorización IPTC de primer nivel, endpoints `/sources` | Entidades Canal y Fuente RSS, repositorio |
| Carga inicial de fuentes por continente (4.2.1) | — | Ejecución y verificación del *seed* | *Seed* reproducible versionado |
| Diccionario de términos evaluables (4.2.2) | UI de gestión del diccionario | CRUD `/dictionary`, búsqueda | Entidad Término, repositorio |
| Captura automática y manual de noticias (4.2.3) | Acción de actualización manual | Cron de captura, periodicidad parametrizada, control de duplicados | Persistencia de la noticia con fecha y hora de registro |
| Procesado y cálculo del humor (4.2.4) | — | Motor de análisis de sentimiento (ES/EN), `POST /sentiment` | Persistencia del valor de humor junto a la noticia |
| Purgado de información antigua (4.2.5) | Acción de borrado manual | Proceso automático de purgado según caducidad configurada | Borrado físico de las noticias caducadas |
| Parámetros de cron y caducidad (4.2.3, 4.2.5) | Formulario de parámetros generales | `GET`/`PUT /config` | Entidad Configuración |
| Dashboard de humor y nube de palabras (4.3.1, 4.3.2) | Mapa mundial interactivo con selector de fecha, nube de palabras con filtros | Endpoints `/dashboards` y agregación por continente/país y fecha | Consultas agregadas e índices de apoyo |
| Listado de noticias influyentes (4.3.2) | Listado con filtros | Criterio de influencia (pendiente de **ADR-002**) y endpoint | Consulta ordenada |

### 4.4 Estructura de directorios adoptada

Estructura del repositorio compatible con la exigida por la especificación (`/docs` y `/opsx`, secc. 4.7) y con la tarea `INFRA-01`. Los nombres de los directorios internos podrán ajustarse a las convenciones del stack que fije el ADR-003, **manteniendo la correspondencia uno a uno con las tres capas**:

```
/
├── backend/
│   ├── api/            # Adaptador REST: rutas /api/v1, validación de entrada, códigos de respuesta
│   ├── services/       # CAPA DE LÓGICA DE NEGOCIO: captura, sentimiento, agregación, purgado
│   ├── repositories/   # CAPA DE DATOS: acceso al gestor de datos
│   ├── models/         # CAPA DE DATOS: entidades y esquema
│   └── tests/          # unitarias por módulo + integración API ↔ BD
├── frontend/           # CAPA DE PRESENTACIÓN: dashboards y panel de administración
├── docs/
│   ├── adr/            # ADR-000, ADR-001, ADR-002, ...
│   └── uml/            # casos de uso, E/R, componentes
├── opsx/               # contratos y especificaciones generadas por OpenSpec
├── docker-compose.yml
└── README.md
```

> El directorio `api/` es el punto de entrada HTTP de la capa de lógica de negocio, no una cuarta capa: traduce peticiones y respuestas, y delega toda decisión en `services/`.

---

## 5. Consecuencias

### 5.1 Positivas

- Cumple de forma directa y auditable C-01, C-02 y C-03, que son requisitos obligatorios de la especificación.
- Desbloquea las tareas `INFRA-02`, `MOD-01` y `SWG-00` del Sprint 0, y con ellas el inicio de `E1-H01` en Sprint 1.
- Permite el trabajo en paralelo de Backend y Frontend con el documento OpenAPI como frontera contractual (R-5), reduciendo el acoplamiento entre personas además del acoplamiento entre módulos.
- Hace directamente ejecutables las dos familias de pruebas de integración que la especificación nombra —API ↔ base de datos y Frontend ↔ API—, porque coinciden exactamente con las dos fronteras de capa.
- Aporta a las herramientas de IA un contexto arquitectónico explícito y estable, en línea con el enfoque SDD adoptado por el curso.

### 5.2 Negativas y costes asumidos

- Mayor número de ficheros e indirecciones que un acceso directo a datos desde los controladores; el coste se paga en las primeras historias del Sprint 1.
- Escritura de código de mapeo entre modelos de datos y respuestas de la API.
- El despliegue sigue siendo monolítico: el cron de captura y la API de consulta escalan juntos. Se acepta, porque la especificación no exige escalado independiente.

### 5.3 Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Erosión de la separación bajo presión de plazo (lógica que se filtra a `api/` o consultas en `services/`). | Verificación explícita en revisión de *pull request* (ver secc. 6) y regla incorporada a la *Definition of Done* (`DOD-01`). |
| Código generado por IA que rompe la separación de capas por desconocer la decisión. | Este ADR y su regla R-1..R-6 se incorporan a los ficheros de contexto de IA del proyecto (Especificación, secc. 4.7, punto 5). |
| La Unidad 6 (Arquitectura) del Syllabus se imparte en las semanas 7–9, es decir **después** del Sprint 0 en que se toma esta decisión. | La decisión coincide con lo que la especificación ya prescribe, por lo que el riesgo de revisión de fondo es bajo; los contenidos de la Unidad 6 (diagramas de componentes e interfaces) se aplicarán al diagrama de componentes del entregable UML, y este ADR se revisará entonces mediante una revisión o, si procede, un ADR que lo supersede. |
| El equipo confunde `api/` con una cuarta capa y le atribuye lógica de negocio. | Nota normativa al pie de la secc. 4.4 y criterio de revisión C-V2 de la secc. 6. |

---

## 6. Cumplimiento y verificación

Cómo se comprueba que la decisión se respeta —y no solo se declara:

| # | Criterio verificable | Momento / mecanismo |
|---|---|---|
| C-V1 | La capa de presentación no contiene ninguna llamada a la base de datos ni credenciales de acceso a datos. | Revisión de *pull request*; análisis estático |
| C-V2 | Los módulos de `api/` no contienen reglas de negocio: delegan en `services/`. | Revisión de *pull request* |
| C-V3 | Los módulos de `services/` no contienen sentencias de acceso al gestor de datos. | Revisión de *pull request*; análisis estático |
| C-V4 | El motor de sentimiento y el purgado tienen pruebas unitarias que se ejecutan sin base de datos ni servidor HTTP. | Pipeline CI (`QA-S2`) |
| C-V5 | Existen pruebas de integración API ↔ BD y Frontend ↔ API. | Pipeline CI (`INT-S1`, `INT-S2`, Sprint 3) |
| C-V6 | Todo endpoint consumido por el frontend está publicado en `/api/docs` bajo `/api/v1`. | Revisión de `SWG-00` y sucesivas revisiones de Swagger |
| C-V7 | Cobertura unitaria ≥ 80 % en captura, análisis y purgado. | Pipeline CI y cierre de Sprint 4 (`QA-01`) |
| C-V8 | Sin incidencias críticas ni bloqueantes en el análisis de calidad de código. | SonarQube, Sprint 4 (`QA-02`) |

Estos criterios se proponen como entrada para la *Definition of Done* del equipo (tarea `DOD-01`, Sprint 0).

---

## 7. Implicaciones sobre el stack tecnológico

La especificación **no restringe** lenguaje, plataforma ni tecnología (secc. 4.6, párrafo final, tras 4.6.3), y las tecnologías de la secc. 6.2 están enunciadas como **recomendaciones**, no como obligaciones:

| Capa | Tecnologías recomendadas por la especificación (secc. 6.2) |
|---|---|
| Presentación | React.js, Angular o Vue.js; gráficos con Chart.js o D3.js; mapas con Leaflet o Mapbox |
| Lógica de negocio | Python (FastAPI, Django) o Node.js (Express) para la API REST y la lógica de negocio |
| Datos | SQLite (prototipado) o MongoDB (escalabilidad), **justificando la elección** |
| Transversal | Docker; SonarQube; GitHub Actions; OpenSpec (o GitHub SpecKit); Copilot / Claude Code |

**En la documentación del equipo revisada a la fecha de este ADR —Backlog Definitivo, Planificación de Sprints v2 y Plan de carga de Jira— no consta ninguna decisión adoptada sobre el stack concreto.** Por coherencia con el principio de no dar por decidido lo que el equipo no ha decidido, este ADR **no fija el stack** y establece en su lugar el siguiente requisito de admisibilidad:

> Cualquier stack que el equipo seleccione deberá permitir el cumplimiento de las reglas R-1 a R-6, la publicación de un documento OpenAPI en `/api/docs` bajo `/api/v1`, la ejecución de la lógica de negocio en pruebas unitarias sin base de datos y el empaquetado en Docker.

Se propone abrir **ADR-003 — Selección del stack tecnológico**, con la elección de base de datos justificada tal como exige la secc. 6.2. Es una tarea del Sprint 0 según su naturaleza (`INFRA-02` depende de ella de hecho, aunque el plan solo la declare dependiente de ADR-000), por lo que debería resolverse en la misma sesión en que se apruebe este ADR.

---

## 8. Trazabilidad

| Elemento de este ADR | Origen |
|---|---|
| Tres capas: presentación, lógica de negocio, datos | Especificación HumWorld, secc. 6.1 |
| Separación clara entre capas y modularidad | Especificación HumWorld, secc. 4.6.2 |
| Gestor de datos + capa de lógica + capa de visualización + API REST | Especificación HumWorld, secc. 4.6 (párrafo final, tras 4.6.3) |
| Convenciones `/api/v1`, JSON, códigos de respuesta, Swagger en `/api/docs` | Especificación HumWorld, secc. 10.1 y 10.3 |
| Pruebas entre capas y cobertura mínima del 80 % | Especificación HumWorld, secc. 7 |
| ADR como entregable documental en `/docs` | Especificación HumWorld, secc. 4.7 (punto 4); P4 — La Fábrica de Software |
| Formato único de ADR para todo el proyecto | P2 — Agentes, Paso 3 |
| Requisito técnico "Arquitectura en capas" y su responsable | Backlog Definitivo, tabla de requisitos técnicos |
| Tarea `ADR-000` en Sprint 0, responsable, criterio de finalización y dependencias | Planificación de Sprints HumWorld v2, secc. 3 y 4; Plan de carga de Jira (EP-0) |
| Ausencia de autenticación (C-09) | Especificación, secc. 3; Backlog Definitivo R-03; Planificación v2, D-07 |
| Estilos arquitectónicos evaluados y principios de modularidad, cohesión y acoplamiento | Syllabus, Unidad 6 — Arquitectura (semanas 7–9) |
| Reglas R-1 a R-6, estructura de directorios y criterios C-V1 a C-V8 | **Decisión del equipo adoptada en este ADR** (no derivada literalmente de las fuentes) |

---

## 9. Supuestos y puntos abiertos

1. **Supuesto.** Se asume una única aplicación desplegable que integra las tres capas, con el frontend servido como aplicación web independiente que consume la API. La especificación no lo dice de forma explícita, pero es coherente con el empaquetado Docker de la secc. 6.2 y con la tarea `INFRA-02`.
2. ~~**Punto abierto.** El stack tecnológico no está decidido (ver secc. 7) → propuesta de **ADR-003**.~~ **Resuelto el 25 de agosto de 2026:** `ADR-003` fija Python 3.12 + FastAPI, PostgreSQL 16 con SQLAlchemy y Alembic, y React + Vite + TypeScript. El requisito de admisibilidad de la secc. 7 se verifica en la secc. 6 de ese ADR.
3. **Punto abierto.** La topología concreta de servicios de `docker-compose` (número de contenedores y su correspondencia con las capas) se define en `INFRA-02` y quedará condicionada por el ADR-003.
4. **Dependencia hacia adelante.** `MOD-01` (modelo E/R inicial: Canal, Fuente RSS, Noticia, Término, Configuración) debe respetar la asignación de responsabilidades de la secc. 4.3 de este ADR.
5. **Observación de proceso.** El Sprint 0 estaba planificado del 10 al 14 de agosto de 2026 (Planificación v2, secc. 3); este ADR se redacta el 25 de agosto de 2026, con posterioridad a esa ventana. La desviación debe reflejarse en el seguimiento del proyecto, y conviene revisar si el resto de tareas del Sprint 0 y las fechas de los sprints siguientes requieren replanificación.

---

## 10. Referencias

1. Especificación del Proyecto Final **HumWorld — ¿De qué humor está el mundo?**, Universidad Andrés Bello, curso 2026-27 (secc. 3, 4.1, 4.2, 4.3, 4.6.2, 4.6.3, 4.7, 6.1, 6.2, 7, 8, 10.1, 10.2, 10.3).
2. **Backlog Definitivo HumWorld** — requisitos técnicos y restricción R-03.
3. **Planificación de Sprints HumWorld v2** — secc. 1 (integrantes, capacidad y supuestos), 2 (decisiones D-01 a D-13), 3 y 4 (tablas de sprints).
4. **Plan de carga de Jira (HUM)** — épica EP-0, tarea ADR-000 y dependencias.
5. **Syllabus** *Uso de Inteligencia Artificial en Ingeniería de Software*, curso 2026 — Unidad 6, Arquitectura de Sistemas de Software.
6. **P2 — Agentes** (Paso 3: uso de un formato único de ADR) y **P4 — La Fábrica de Software** (ADR como entregable de documentación técnica).

---

## 11. Historial de revisiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 0.1 | 2026-08-25 | Matías Santos | Redacción inicial. Estado: Propuesto, pendiente de revisión por el equipo. |
| 0.2 | 2026-08-25 | Matías Santos | Consolidación en el repositorio `HumWorld-E2`. Sustituye a la versión breve `ADR-000-arquitectura-en-capas.md`, que se archiva en `docs/adr/archivo/`. Sin cambios de fondo en la decisión: la versión breve declaraba las mismas tres capas y la misma frontera `/api/v1`, sin reglas de dependencia, alternativas evaluadas ni criterios de verificación. |
| 1.0 | 2026-08-25 | Matías Santos | **Estado: Aceptado.** Acordado por los cuatro integrantes en la Daily del 25 de agosto de 2026, con aceptación verbal registrada en la cabecera. Sin cambios en el contenido de la decisión respecto de la versión 0.2. El punto abierto n.º 2 de la secc. 9 (stack tecnológico) queda resuelto por `ADR-003`, acordado en la misma sesión. |
