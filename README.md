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
| **Mapa y gráficos** | react-simple-maps (coropleta por continente), Chart.js, d3-cloud |
| **Pruebas** | pytest + pytest-cov (backend), Vitest + Testing Library (frontend) |
| **Calidad de código** | SonarCloud |
| **Contenerización** | Docker Compose: backend, frontend y base de datos |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |
| **API** | REST bajo `/api/v1`, JSON, OpenAPI generado en `/api/docs` |
| **Modelo de datos** | [`MOD-01`](docs/uml/MOD-01-modelo-er-inicial.md) |

> El entorno de Sprint 0 todavía corre con los contenedores esqueleto anteriores a `ADR-003` (imagen base `node:22-alpine`, puertos `3000` y `5173`). Su migración al stack decidido es trabajo de `INFRA-02` y `CICD-00`.

## 4. Estructura del repositorio

```text
HumWorld-E2/
├── backend/              Capa de lógica de negocio y API REST
│   ├── api/              Adaptador REST: rutas /api/v1, validación, códigos de respuesta
│   ├── services/         Captura, análisis de sentimiento, agregación, purgado
│   ├── repositories/     Acceso al gestor de datos
│   ├── models/           Entidades y esquema
│   └── tests/            Pruebas unitarias y de integración
├── frontend/             Capa de presentación: dashboards y panel de administración
├── docs/
│   ├── adr/              Decisiones de arquitectura (ADR)
│   ├── uml/              Casos de uso, modelo E/R, componentes
│   ├── sprints/          Planificación y seguimiento por sprint
│   └── definition-of-done.md
├── opsx/                 Contratos OpenSpec y configuración de entorno (docker-compose.yml)
├── .github/workflows/    Pipelines de CI/CD
└── README.md
```

Los subdirectorios de `backend/` se crean conforme avanzan las historias; su correspondencia uno a uno con las tres capas es normativa (`ADR-000`, secc. 4.4).

## 5. Puesta en marcha

**Requisitos:** Docker y Docker Compose.

Levantar el entorno desde la carpeta `opsx`:

```bash
docker compose up --build
```

Detenerlo:

```bash
docker compose down
```

> En Sprint 0 los contenedores son esqueletos: el objetivo es verificar que Docker Compose levanta backend y frontend sin errores, no que expongan funcionalidad.

## 6. API prevista

Base: `/api/v1` · Formato: JSON · Documentación interactiva: `/api/docs`

| Recurso | Métodos | Propósito |
|---|---|---|
| `/sources` | GET, POST, PUT, PATCH, DELETE | Gestión de canales y fuentes RSS |
| `/news` | GET, DELETE | Consulta de noticias, noticias influyentes y purgado |
| `/dictionary` | GET, POST, PUT, PATCH, DELETE | Diccionario de términos evaluables |
| `/config` | GET, PUT | Parámetros generales (periodicidad de captura, caducidad de noticias) |
| `/sentiment` | GET, POST | Humor global, por continente, por país, *timeline*; análisis de un texto puntual |
| `/dashboards` | GET | Datos agregados para el mapa mundial y la nube de palabras |

Códigos de respuesta: `200`, `201`, `204`, `400`, `404`, `500`.

## 7. Documentación

| Documento | Contenido |
|---|---|
| [`docs/adr/ADR-000`](docs/adr/ADR-000-arquitectura-tres-capas.md) | Arquitectura en tres capas y reglas de dependencia |
| [`docs/adr/ADR-003`](docs/adr/ADR-003-stack-tecnologico.md) | Selección del stack tecnológico y justificación del gestor de datos |
| [`docs/uml/MOD-01`](docs/uml/MOD-01-modelo-er-inicial.md) | Modelo E/R preliminar: entidades, relaciones e integridad |
| [`docs/definition-of-done.md`](docs/definition-of-done.md) | Definition of Done del equipo |
| [`docs/sprints/`](docs/sprints/) | Planificación y seguimiento por sprint |
| [`docs/requisitos-resumen.md`](docs/requisitos-resumen.md) | Resumen de alcance, funcionalidades y endpoints |
| `opsx/` | Contratos y especificaciones generadas por OpenSpec |

## 8. Equipo

| Integrante | Rol |
|---|---|
| José Romero | Backend |
| Sebastián Márquez | Frontend |
| David Cortez | DevOps y Calidad |
| Matías Santos | Arquitectura y Documentación |

## 9. Estado del proyecto

**Sprint 0 — Entorno técnico, de gestión y de calidad.** Repositorio base y estructura `/docs` y `/opsx`, `ADR-000` (arquitectura), `ADR-003` (stack), Docker Compose base, CI inicial, Definition of Done acordada y modelo de datos inicial (`MOD-01`).

El desarrollo funcional comienza en el Sprint 1 con la épica de captura RSS.
