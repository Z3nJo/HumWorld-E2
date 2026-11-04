# HumWorld — ¿De qué humor está el mundo?

Aplicación web que calcula el "humor" o estado emocional predominante en distintas zonas del mundo a partir de noticias publicadas en canales RSS de medios de comunicación y fuentes oficiales.

Proyecto final de la asignatura **Uso de Inteligencia Artificial en Ingeniería de Software** — Universidad Andrés Bello, curso 2026-27.

---

## 1. Objetivo

Capturar noticias desde fuentes RSS públicas, asignarles un valor numérico de sentimiento mediante un algoritmo propio y visualizar el resultado agregado por continente y país en dashboards interactivos.

Funcionalidades principales:

- Gestión de canales (medios) y fuentes RSS categorizadas con IPTC Media Topics (primer nivel).
- Captura automática mediante *cron* de periodicidad configurable, más actualización manual bajo demanda.
- Diccionario de términos evaluables con CRUD completo vía API REST e interfaz de usuario.
- Cálculo y persistencia del valor de humor por noticia, en español e inglés.
- Atribución geográfica versionada por países mencionados, con catálogo local reproducible y respaldo por fuente.
- Dashboards: mapa mundial con selector de fecha, nube de palabras influyentes y listado de noticias más influyentes.
- Purgado automático y manual de noticias según un parámetro de caducidad configurable.

## 2. Alcance y limitaciones

| | |
|---|---|
| **Fuentes de datos** | Exclusivamente RSS. **No se utiliza web scraping** en ninguna parte del sistema. |
| **Idiomas analizados** | Español e inglés únicamente. |
| **Categorización** | Primer nivel de IPTC Media Topics. |
| **Autenticación** | **No implementada en esta fase.** Todas las operaciones administrativas están disponibles sin inicio de sesión (restricción `R-03`). Por este motivo el entorno no debe exponerse públicamente. |

## 3. Stack técnico

El stack está decidido en [`ADR-003`](docs/adr/ADR-003-stack-tecnologico.md), con la justificación de cada elección y las alternativas descartadas.

| Elemento | Tecnología |
|---|---|
| **Arquitectura** | Tres capas: presentación → lógica de negocio → datos, con dependencias unidireccionales y sin saltos de capa ([`ADR-000`](docs/adr/ADR-000-arquitectura-tres-capas.md)) |
| **Backend** | Python 3.12 + FastAPI + Pydantic |
| **Acceso a datos** | SQLAlchemy 2.0 + Alembic |
| **Base de datos** | PostgreSQL 16 |
| **Captura RSS y planificación** | feedparser + APScheduler |
| **Frontend** | React + Vite + TypeScript |
| **Mapa y gráficos** | d3, d3-geo, topojson-client y world-atlas (mapa por continente y país, evolución y resumen del dashboard); react-simple-maps (mapa de la landing). La nube de palabras se dibuja con React, sin biblioteca de gráficos |
| **Pruebas** | pytest + pytest-cov (backend), Vitest + Testing Library (frontend) |
| **Calidad de código** | SonarCloud |
| **Contenerización** | Docker Compose: backend, frontend y base de datos |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |
| **API** | REST bajo `/api/v1`, JSON, OpenAPI generado en `/api/docs` |
| **Modelo de datos** | [`MOD-01`](docs/uml/MOD-01-modelo-er-inicial.md) |

`INFRA-02` y `CICD-00` ya proporcionan PostgreSQL 16, backend Python 3.12 y pruebas pytest contra PostgreSQL en el pipeline.

## 4. Estructura del repositorio

```text
HumWorld-E2/
├── backend/              Capa de lógica de negocio y API REST
│   ├── app/api/          Adaptador REST: rutas /api/v1, validación, códigos de respuesta
│   ├── app/services/     Casos de uso y reglas de negocio
│   ├── app/repositories/ Acceso a PostgreSQL mediante SQLAlchemy
│   ├── app/models/       Entidades y dominios
│   ├── alembic/          Migraciones versionadas
│   └── tests/            Pruebas unitarias y de integración
├── frontend/             Capa de presentación: dashboards y panel de administración
├── docs/
│   ├── adr/              Decisiones de arquitectura (ADR)
│   ├── uml/              Casos de uso, modelo E/R, componentes
│   ├── openapi/          Contrato OpenAPI exportado desde la aplicación
│   ├── operations/       Guías operativas (credenciales PostgreSQL)
│   ├── sprints/          Planificación y seguimiento por sprint
│   └── definition-of-done.md
├── openspec/            Fuente editable de especificaciones y cambios OpenSpec
├── opsx/                 Contratos OpenSpec generados y configuración de entorno (docker-compose.yml)
├── .github/workflows/    Pipelines de CI/CD
└── README.md
```

Los subdirectorios de `backend/` se crean conforme avanzan las historias; su correspondencia uno a uno con las tres capas es normativa (`ADR-000`, secc. 4.4).

## 5. Puesta en marcha

**Requisitos:** Docker y Docker Compose.

Antes del primer arranque, copiar `.env.example` a `.env` en la raíz y completar
las credenciales privadas siguiendo [la guía de PostgreSQL](docs/operations/postgresql-credentials.md).
En instalaciones existentes, seguir primero la sección de rotación: cambiar `.env`
no modifica la contraseña del rol almacenada en el volumen.

Levantar el entorno desde la raiz del repositorio:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml up --build
```

Detenerlo:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml down
```

Al iniciar, el contenedor `backend` aplica las migraciones (`alembic upgrade head`), siembra el catálogo geográfico local (`python -m app.seeds.geography`) y arranca uvicorn con un solo proceso; con `CAPTURE_SCHEDULER_ENABLED=true` (valor por defecto) siembra además los parámetros y el léxico de sentimiento y arranca el planificador.

Los canales y fuentes RSS **no** se siembran solos. Tras el primer arranque:

```bash
docker compose --env-file .env -f opsx/docker-compose.yml exec backend python -m app.seeds.sources
```

El comando es idempotente: crea seis canales, uno por continente.

| Servicio | URL |
|---|---|
| Frontend (servidor de Vite) | `http://localhost:5173` |
| API y Swagger | `http://localhost:3000/api/docs` (JSON en `/api/openapi.json`) |
| PostgreSQL 16 | `localhost:5432` |

Para desarrollo sin Docker, ver [`backend/README.md`](backend/README.md) (migraciones, seeds y pruebas) y [`frontend/README.md`](frontend/README.md) (pnpm, Vite y Vitest).

## 6. API

Base: `/api/v1` · Formato: JSON · Documentación interactiva: `/api/docs`

| Recurso | Métodos | Propósito |
|---|---|---|
| `/sources` | GET, POST, PUT, PATCH, DELETE | E1-H01: gestión de fuentes RSS y alta de canales con sus fuentes |
| `/sources/capture` | POST | E1-H05: captura manual inmediata de todas las fuentes activas o de una selección |
| `/channels` | GET, PUT, PATCH, DELETE | Gestión de canales (medios); `DELETE` desactiva el canal |
| `/news` | DELETE | E4-H03: purgado manual de las noticias caducadas. El purgado automático (E4-H02) es un trabajo del planificador |
| `/dictionary` | GET, POST, PUT, PATCH, DELETE | E2-H01-API: gestión CRUD y búsqueda de términos evaluables; `DELETE` desactiva el término |
| `/config` | GET, PUT | E1-H04 y E4-H01: parámetros generales (periodicidad de captura, caducidad de noticias) |
| `/sentiment` | POST | E2-H04: análisis puntual de un texto, sin persistencia |
| `/dashboards` | GET | T-DASH-01, E3-H01, E3-H02 y E3-H03: humor agregado (`""`), `/geografia`, `/evolucion`, `/nube-palabras` y `/noticias-influyentes` (ADR-002) |

El contrato completo está en [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml), exportado desde `/api/openapi.json`.

Códigos de respuesta: `200`, `201`, `204`, `400`, `404`, `500`.

## 7. Documentación

| Documento | Contenido |
|---|---|
| [`docs/adr/ADR-000`](docs/adr/ADR-000-arquitectura-tres-capas.md) | Arquitectura en tres capas y reglas de dependencia |
| [`docs/adr/ADR-001`](docs/adr/ADR-001-algoritmo-calculo-humor.md) | Algoritmo de cálculo del humor, rango `[-1, 1]` y agregación regional |
| [`docs/adr/ADR-002`](docs/adr/ADR-002-criterio-noticia-influyente.md) | Criterio de noticia influyente: mayor valor absoluto de humor, top 10 |
| [`docs/adr/ADR-003`](docs/adr/ADR-003-stack-tecnologico.md) | Selección del stack tecnológico y justificación del gestor de datos |
| [`docs/adr/ADR-004`](docs/adr/ADR-004-arquitectura-interna-frontend.md) | Organización interna del frontend por funcionalidad |
| [`docs/uml/MOD-01`](docs/uml/MOD-01-modelo-er-inicial.md) | Modelo E/R preliminar: entidades, relaciones e integridad |
| [`docs/uml/UML-01`](docs/uml/UML-01-casos-de-uso.md) | Diagrama de casos de uso: actores, casos de uso y endpoints |
| [`docs/uml/UML-02`](docs/uml/UML-02-diagrama-componentes.md) | Diagrama de componentes: frontend, capas del backend, scheduler y PostgreSQL |
| [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml) | Contrato OpenAPI de la API REST, exportado desde la aplicación |
| [`docs/operations/postgresql-credentials.md`](docs/operations/postgresql-credentials.md) | Generación, uso y rotación de las credenciales de PostgreSQL |
| [`docs/definition-of-done.md`](docs/definition-of-done.md) | Definition of Done del equipo |
| [`docs/sprints/`](docs/sprints/) | Planificación, cierre y evidencia de validación por sprint e historia |
| [`docs/sprints/planificacion-sprint-1.md`](docs/sprints/planificacion-sprint-1.md) | Planificación del Sprint 1 (31 puntos) |
| [`docs/sprints/cierre-sprint-1.md`](docs/sprints/cierre-sprint-1.md) | Resultado del Sprint 1, métricas reales y primera recalibración |
| [`docs/sprints/planificacion-sprint-2.md`](docs/sprints/planificacion-sprint-2.md) | Planificación del Sprint 2 (35 puntos) |
| [`docs/sprints/cierre-sprint-2.md`](docs/sprints/cierre-sprint-2.md) | Resultado del Sprint 2, métricas y recalibración de velocidad |
| [`docs/sprints/cierre-sprint-3.md`](docs/sprints/cierre-sprint-3.md) | Resultado del Sprint 3, métricas de CI, deuda abierta y recalibración |
| [`docs/requisitos-resumen.md`](docs/requisitos-resumen.md) | Resumen de alcance, funcionalidades y endpoints |
| `openspec/` | Única fuente editable de propuestas, especificaciones y tareas OpenSpec; incluye las capacidades frontend bajo `openspec/specs/frontend/` |
| `opsx/contracts/` | Copia entregable de todas las especificaciones de `openspec/specs/`, generada con `python opsx/sync_contracts.py` (CI ejecuta `--check`) |

### Uso de IA

El proyecto se desarrolla con asistentes de IA bajo un flujo guiado por especificaciones. Los artefactos que dirigen a los asistentes están versionados:

| Artefacto | Uso |
|---|---|
| `.agents/skills/openspec-*/SKILL.md` | Instrucciones de los asistentes para explorar, proponer, aplicar, sincronizar y archivar cambios OpenSpec |
| `openspec/config.yaml` | Configuración del flujo OpenSpec (`schema: spec-driven`) |
| `openspec/changes/` | Propuesta, diseño, especificación y tareas de cada cambio; los cerrados se archivan en `archive/` |

## 8. Equipo

| Integrante | Rol |
|---|---|
| José Romero | Backend |
| Sebastián Márquez | Frontend |
| David Cortez | DevOps y Calidad |
| Matías Santos | Arquitectura y Documentación |

## 9. Estado del proyecto

- **Sprint 1 — Captura RSS: cerrado.** Se entregaron los 31 puntos comprometidos (`INFRA-02`, `CICD-00`, E1-H01, E1-H02, E1-H04, E4-H01, E1-H03, E1-H05, `QA-S1` e `INT-S1`).
- **Sprint 2 — Motor de sentimiento y purgado: cerrado.** Se entregaron los 35 puntos comprometidos: E2-H01-API, ADR-001, E2-H02, E2-H03, E2-H04, E4-H02, `QA-S2`, `INT-S2` y `DOC-S2`.
- **Sprint 3 — Interfaz de usuario y dashboards: cerrado.** Se entregaron los 41 puntos comprometidos: E2-H01-UI, T-DASH-01, E3-H01, E3-H03, E4-H04, ADR-002, `QA-S3`, `INT-S3` y `DOC-S3`.

El sistema cuenta con el motor de sentimiento en español e inglés formalizado en ADR-001, con cálculo y persistencia del humor por noticia en PostgreSQL, desglose de términos en `NOTICIA_TERMINO`, léxico curado reproducible (catálogo inicial ampliado a 8000 términos en el Sprint 4), CRUD de diccionario en `/api/v1/dictionary`, endpoint `POST /api/v1/sentiment` para análisis puntual y purgado periódico de noticias caducadas. La suite cuenta con 168 pruebas y 97,62 % de cobertura (CI y revalidación local del 28 de septiembre de 2026), con verificación contra PostgreSQL 16 real.

La pertenencia temática se resuelve mediante `NOTICIA_PAIS → PAIS`: admite múltiples países por noticia, conserva la evidencia del alias, versiona la clasificación y evita duplicaciones en los agregados. El canal sigue representando la procedencia editorial y solo actúa como respaldo cuando el texto no menciona un país.

Desde el Sprint 3 cuenta además con una interfaz React/Vite: dashboard con mapa mundial por continente y país, evolución diaria y nube de palabras (`/dashboard`), gestión del diccionario (`/dictionary`) y panel de administración de fuentes, canales y parámetros (`/fuentes`, `/parametros`), sobre los endpoints `/api/v1/dashboards` y `/api/v1/channels`. En CI sobre `main` (16 de octubre de 2026) la suite backend tiene 242 pruebas y 97,82 % de cobertura, y la suite frontend, 136 pruebas.

El detalle del resultado, las métricas y la recalibración de velocidad están en [`docs/sprints/cierre-sprint-3.md`](docs/sprints/cierre-sprint-3.md) (Sprint 2: [`docs/sprints/cierre-sprint-2.md`](docs/sprints/cierre-sprint-2.md)).

- **Sprint 4 — Estabilización y cierre.** Integrado en `main` (PR #72 a #105): noticias influyentes (`E3-H02`), purgado manual por API e interfaz (`E4-H03`), atribución geográfica por país mencionado (`NOTICIA_PAIS`, catálogo local), catálogo inicial de sentimiento ampliado a 8000 términos, eliminación de credenciales PostgreSQL versionadas, pruebas de integración finales (`QA-01`) y cobertura sobre el 80 % (`QA-02`).
