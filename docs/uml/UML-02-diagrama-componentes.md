# UML-02 — Diagrama de componentes

| Campo | Valor |
|---|---|
| **Identificador** | `UML-02` |
| **Épica / Sprint** | Transversal — Sprint 3 (`DOC-S3`) |
| **Responsable** | Matías Santos (Arquitectura y Documentación) |
| **Depende de** | `ADR-000` (tres capas), `ADR-001` (cálculo del humor), `ADR-003` (stack), `ADR-004` (frontend), `MOD-01` (modelo E/R) |
| **Estado** | Publicado — refleja `main` en `bc43219` (16 de octubre de 2026) |
| **Fecha** | 2026-10-19 |
| **Fuente** | Especificación HumWorld 260714, secc. 4.7 (punto 3); `backend/app/`, `frontend/src/`, `opsx/docker-compose.yml` |

---

## 1. Alcance

Muestra los componentes desplegables de HumWorld, sus módulos internos y las interfaces por las que se comunican, tal como están en el código. Los nombres de los nodos son módulos o clases reales.

No incluye el detalle de entidades y atributos, que está en [`MOD-01`](MOD-01-modelo-er-inicial.md), ni el flujo de usuario, que está en [`UML-01`](UML-01-casos-de-uso.md).

---

## 2. Diagrama

```mermaid
flowchart LR
    USR["Navegador"]
    RSS["Feeds RSS externos"]

    subgraph DC["Docker Compose · opsx/docker-compose.yml"]
        subgraph FE["frontend · React 19 + Vite · :5173"]
            ROUTER["App.tsx<br/>createBrowserRouter"]
            SHELL["components/AppShell"]
            PAGES["pages/<br/>Dashboard · Dictionary · Sources · Parameters"]
            subgraph FEAT["features/ · ADR-004"]
                F_LAND["landing"]
                F_DASH["dashboard"]
                F_DICT["dictionary"]
                F_SRC["sources"]
                F_CFG["config"]
            end
            HTTP["shared/api/httpClient.ts<br/>VITE_API_URL"]
            PROXY["Proxy de Vite<br/>/api → VITE_API_TARGET"]
        end

        subgraph BE["backend · FastAPI · :3000"]
            MAIN["main.py<br/>lifespan, errores 400/404, /api/docs"]
            subgraph API["app/api · presentación"]
                R_CFG["configuration.py"]
                R_CHN["channels.py"]
                R_DSH["dashboards.py"]
                R_DIC["dictionary.py"]
                R_SEN["sentiment.py"]
                R_SRC["sources.py"]
            end
            subgraph SVC["app/services · lógica de negocio"]
                S_CFG["ConfigurationService"]
                S_CHN["ChannelService"]
                S_DSH["DashboardService"]
                S_DIC["DictionaryService"]
                S_SEN["SentimentAnalysisService<br/>SentimentConfigurationService"]
                S_SRC["SourceService"]
                S_CAP["NewsCaptureService<br/>HttpxFeedparserClient"]
                S_PUR["NewsPurgeService"]
                ENGINE["sentiment_engine.py<br/>calculate_sentiment · ADR-001"]
            end
            subgraph REPO["app/repositories · datos"]
                REPOS["Configuration · Channel · Dashboard · Term<br/>Source · NewsCapture · NewsPurge Repository"]
            end
            MODELS["app/models<br/>Channel · RssSource · News · Term · NewsTerm · Configuration"]
            DB_MOD["database.py · config.py<br/>SQLAlchemy + psycopg"]
            SCHED["scheduler.py · CaptureScheduler<br/>rss-news-capture · news-purging"]
            SEEDS["app/seeds<br/>sources · sentiment"]
        end

        PG[("PostgreSQL 16<br/>postgres:16-alpine · :5432<br/>migraciones Alembic")]
    end

    USR --> ROUTER
    ROUTER --> SHELL
    ROUTER --> F_LAND
    SHELL --> PAGES
    PAGES --> F_DASH
    PAGES --> F_DICT
    PAGES --> F_SRC
    PAGES --> F_CFG
    F_DASH --> HTTP
    F_DICT --> HTTP
    F_SRC --> HTTP
    F_CFG --> HTTP
    HTTP -->|"HTTP JSON /api/v1"| PROXY
    PROXY -->|"HTTP JSON /api/v1"| MAIN

    MAIN --> API
    MAIN -->|"arranca"| SCHED
    MAIN -->|"siembra al arrancar"| SEEDS

    R_CFG --> S_CFG
    R_CHN --> S_CHN
    R_DSH --> S_DSH
    R_DSH --> S_SEN
    R_DIC --> S_DIC
    R_SEN --> S_SEN
    R_SRC --> S_SRC
    R_SRC --> S_CAP

    S_CFG -->|"reschedule"| SCHED
    SCHED --> S_CAP
    SCHED --> S_PUR
    SCHED --> S_CFG

    S_CAP --> ENGINE
    S_SEN --> ENGINE
    S_CAP -->|"httpx + feedparser"| RSS

    S_CFG --> REPOS
    S_CHN --> REPOS
    S_DSH --> REPOS
    S_DIC --> REPOS
    S_SEN --> REPOS
    S_SRC --> REPOS
    S_CAP --> REPOS
    S_PUR --> REPOS
    SEEDS --> MODELS

    REPOS --> MODELS
    MODELS --> DB_MOD
    DB_MOD -->|"SQL · DATABASE_URL"| PG
```

> Las flechas indican dependencia de uso (quién llama a quién). `F_LAND` no llama a la API: la landing muestra datos de ejemplo. El proxy de Vite solo actúa con `VITE_API_URL` vacío, que es el valor por defecto.

---

## 3. Componentes

### 3.1 Frontend (`frontend/src`)

| Componente | Responsabilidad |
|---|---|
| `App.tsx` | Rutas: `/` (landing) y, dentro de `AppShell`, `/dashboard`, `/dictionary`, `/fuentes` y `/parametros`. Cualquier otra ruta redirige a `/dictionary`. |
| `components/AppShell` | Marco común con la navegación lateral. |
| `pages/` | Pantallas. Código anterior a `ADR-004`, organizado por tipo. |
| `features/<funcionalidad>/` | Código nuevo según `ADR-004` (estado Propuesto): `domain`, `application` (hooks como `useDashboard`, `useSources`, `useConfig`), `infrastructure` (clientes `dashboardApi`, `dictionaryApi`, `sourcesApi`, `configApi`) y `presentation`. |
| `features/dashboard/presentation` | `DashboardMap` (d3 y topojson-client), `DashboardTimeline` y `DashboardSummary` (d3), y `DashboardWordCloud` (React sin bibliotecas de gráficos). |
| `shared/api/httpClient.ts` | Único cliente HTTP. Antepone `VITE_API_URL` (vacío por defecto) a las rutas `/api/v1/...`. |
| Proxy de Vite (`vite.config.ts`) | En desarrollo reenvía `/api` a `VITE_API_TARGET` (por defecto `http://localhost:3000`; en Compose, `http://backend:3000`). |

### 3.2 Backend (`backend/app`)

Las capas y sus reglas R-1 a R-6 son normativas (`ADR-000`): `api` → `services` → `repositories` → `models`, en un solo sentido y sin saltos.

| Componente | Responsabilidad |
|---|---|
| `main.py` | Crea la aplicación FastAPI, monta los seis routers bajo `/api/v1`, traduce las excepciones de dominio a `400`/`404` y los errores de validación a `400`, y publica `/api/docs` y `/api/openapi.json`. Su `lifespan` siembra la configuración y el léxico de sentimiento y arranca el scheduler, solo si `CAPTURE_SCHEDULER_ENABLED` es verdadero. |
| `app/api/*` | Routers sin reglas de negocio; validan entrada con los esquemas de `schemas.py` y delegan en un servicio. |
| `app/services/*` | Reglas de negocio. `NewsCaptureService` lee los feeds con `HttpxFeedparserClient` y analiza cada noticia insertada. `DashboardService` valida el filtro y arma los agregados, la evolución, la nube de palabras y las noticias influyentes (`ADR-002`). |
| `sentiment_engine.py` | Motor de cálculo del humor (`ADR-001`): reconoce términos activos del idioma de la noticia y normaliza la puntuación a `[-1, 1]` con la fórmula configurada. No accede a la base de datos y se prueba sin ella. |
| `app/repositories/*` | Únicas clases que consultan PostgreSQL. `DashboardRepository` ejecuta las consultas agregadas. |
| `app/models/*` | Modelos SQLAlchemy de las tablas `canal`, `fuente_rss`, `noticia`, `termino`, `noticia_termino` y `configuracion`. |
| `database.py`, `config.py` | Motor y sesión en caché (`lru_cache`); `config.py` reescribe `postgresql://` a `postgresql+psycopg://`. |
| `scheduler.py` | `CaptureScheduler` sobre `BackgroundScheduler` de APScheduler (UTC). Dos trabajos con intervalo `captura_periodicidad_minutos`: `rss-news-capture` (captura y `process_pending_news()`) y `news-purging` (borra las noticias más antiguas que `noticias_caducidad_dias`). Exige un único proceso de uvicorn. |
| `app/seeds/` | `sources.py` (seis canales, uno por continente; se ejecuta a mano) y `sentiment.py` (parámetros y léxico; se ejecuta al arrancar). |

### 3.3 Infraestructura

| Componente | Detalle |
|---|---|
| PostgreSQL 16 | Imagen `postgres:16-alpine`, puerto `5432`, volumen `postgres_data`. Único gestor admitido (`ADR-003`), también en pruebas. |
| Contenedor `backend` | `python:3.12-slim`; al arrancar ejecuta `alembic upgrade head` y uvicorn en el puerto `3000`. |
| Contenedor `frontend` | `node:22-alpine`; servidor de desarrollo de Vite en el puerto `5173`. |
| Feeds RSS externos | Fuente de las noticias. Solo lectura por RSS. |

---

## 4. Interfaces

| Interfaz | Proveedor | Consumidor | Operaciones |
|---|---|---|---|
| `/api/v1/dashboards` | `api/dashboards.py` | `features/dashboard` | `GET ""`, `GET /geografia`, `GET /evolucion`, `GET /nube-palabras`, `GET /noticias-influyentes` |
| `/api/v1/dictionary` | `api/dictionary.py` | `features/dictionary` | `GET`, `POST`; `GET`, `PUT`, `PATCH`, `DELETE /{term_id}` |
| `/api/v1/sources` | `api/sources.py` | `features/sources` | `GET`, `POST`; `GET`, `PUT`, `PATCH`, `DELETE /{source_id}`; `POST /capture` (sin consumidor en el frontend) |
| `/api/v1/channels` | `api/channels.py` | `features/sources` | `GET`; `GET`, `PUT`, `PATCH`, `DELETE /{channel_id}` |
| `/api/v1/config` | `api/configuration.py` | `features/config` | `GET`, `PUT` |
| `/api/v1/sentiment` | `api/sentiment.py` | Ninguno en el frontend (Swagger o clientes externos) | `POST` |
| `/api/docs`, `/api/openapi.json` | `main.py` | Desarrolladores | Documentación OpenAPI |
| `CaptureScheduleProtocol.reschedule(minutos)` | `scheduler.py` | `ConfigurationService` | Reprograma los dos trabajos tras `PUT /config` |
| `calculate_sentiment(...)` | `sentiment_engine.py` | `NewsCaptureService`, `SentimentAnalysisService` | Cálculo en memoria, sin base de datos |
| SQL sobre `DATABASE_URL` | PostgreSQL 16 | `database.py` (vía repositorios) | Lectura y escritura de las seis tablas |
| RSS sobre HTTP | Medios externos | `HttpxFeedparserClient` | Descarga y parseo de feeds |

---

## 5. Encaje con los ADR

- **ADR-000.** El diagrama respeta el sentido `api` → `services` → `repositories` → `models`. El scheduler y `main.py` actúan como raíz de composición: instancian servicios y repositorios, pero no contienen reglas de negocio.
- **ADR-001.** El motor de sentimiento es un módulo de la capa de servicios sin dependencias de base de datos.
- **ADR-002.** El orden y el límite de las noticias influyentes se ejecutan en `DashboardRepository.influential_news`; el frontend no reordena.
- **ADR-004.** Convive con el código por tipo de `pages/`. Las funcionalidades nuevas (`dashboard`, `sources`, `config`, `landing`) ya siguen la estructura por funcionalidad.

---

*Documento UML-02 — Proyecto HumWorld, Universidad Andrés Bello, curso Uso de IA en Ingeniería de Software 2026-27.*
