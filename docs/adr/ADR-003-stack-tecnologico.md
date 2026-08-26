# ADR-003 — Selección del stack tecnológico

| Campo | Valor |
|---|---|
| **ID** | ADR-003 |
| **Título** | Stack tecnológico: FastAPI, PostgreSQL y React sobre Vite |
| **Estado** | Aceptado — acordado por el equipo el 25 de agosto de 2026 |
| **Fecha de redacción** | 25 de agosto de 2026 |
| **Sprint** | Sprint 0 |
| **Autor / responsable** | Matías Santos — Arquitectura y Documentación |
| **Decisores** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Tarea asociada** | **Sin tarea en el plan de carga de Jira** — ver secc. 9, punto 1 |
| **Depende de** | `ADR-000` (arquitectura en tres capas), secc. 7 |
| **Artefactos dependientes** | `INFRA-02` (Docker base), `SWG-00` (Swagger/OpenAPI), `MOD-01` (modelo E/R), `CICD-00` (pipeline), y toda la épica `EP-1` en adelante |
| **Plantilla** | MADR extendido — formato común obligatorio para todos los ADR del proyecto |
| **Ubicación** | `docs/adr/ADR-003-stack-tecnologico.md` (repositorio `HumWorld-E2`) |

> **Origen de este ADR.** `ADR-000`, secc. 7, dejó el stack deliberadamente sin fijar y propuso abrir este documento, señalando que `INFRA-02` depende de él de hecho aunque el plan de carga no lo declare. Este ADR cierra ese punto abierto.

---

## 1. Contexto y planteamiento del problema

La especificación **no restringe** lenguaje, plataforma ni tecnología: las tecnologías de su secc. 6.2 están enunciadas como recomendaciones. Sí exige, en cambio, justificar la elección del gestor de datos (secc. 6.2, capa de datos).

A la fecha de este ADR, el repositorio contiene contenedores esqueleto basados en `node:22-alpine` para backend y frontend. Esos contenedores se crearon en `INFRA-02` como prueba de que Docker Compose levanta sin errores, **no** como decisión de stack: el propio `ADR-000` deja constancia de que ninguna decisión de stack constaba en la documentación del equipo.

El Sprint 1 no puede comenzar sin esta decisión: `E1-H01` (alta de canales y fuentes RSS) es la primera historia funcional y necesita framework, ORM y gestor de datos definidos.

### 1.1 Restricciones de partida (no negociables)

| # | Restricción | Origen |
|---|---|---|
| C-1 | Tres capas con dependencias unidireccionales y sin saltos de capa (reglas R-1 a R-6) | `ADR-000`, secc. 4.2 |
| C-2 | Documento OpenAPI publicado en `/api/docs`, API bajo `/api/v1`, JSON | Especificación, secc. 10.1, 10.3 |
| C-3 | La lógica de negocio debe poder ejecutarse en pruebas unitarias sin base de datos ni servidor HTTP | `ADR-000`, regla R-4 |
| C-4 | Empaquetado en Docker; pipeline en GitHub Actions | Especificación, secc. 4.6.3, 6.2 |
| C-5 | Cobertura mínima del 80 % en captura, análisis y purgado | Especificación, secc. 7 |
| C-6 | Análisis de sentimiento en español e inglés | Especificación, secc. 3, 4.4 |
| C-7 | Solo RSS; prohibido el web scraping | Especificación, secc. 3, 4.2.1 |
| C-8 | La elección del gestor de datos debe justificarse explícitamente | Especificación, secc. 6.2 |

### 1.2 Alcance de este ADR

**Decide:** lenguaje y framework de backend, gestor de datos y capa de acceso a datos, framework de frontend, librerías estructurales de captura RSS, planificación de tareas y visualización, y herramienta de análisis estático.

**No decide:** el algoritmo de cálculo del humor (`ADR-001`), el criterio de noticia influyente (`ADR-002`), la topología final de `docker-compose` (`INFRA-02`), ni las versiones exactas de cada dependencia, que se fijan en `requirements.txt` y `package.json` en el momento de la instalación.

---

## 2. Drivers de la decisión

| # | Driver | Por qué pesa en este proyecto |
|---|---|---|
| D-1 | **Coste de mantener el contrato OpenAPI** | El contrato entre presentación y lógica de negocio es la frontera de trabajo entre José y Sebastián (`ADR-000`, R-5). Además, `SWG-00` y las cuatro tareas `SWG-S1` a `SWG-04` recorren todos los sprints. Un contrato que se genera desde el código no se desincroniza; uno mantenido a mano, sí. |
| D-2 | **Procesamiento de texto en dos idiomas** | El motor de sentimiento debe tokenizar y normalizar español e inglés (C-6). |
| D-3 | **Correspondencia entre el modelo y el gestor de datos** | `MOD-01` define claves foráneas, una relación N:M con entidad asociativa, unicidad compuesta y consultas de agregación por continente y fecha. |
| D-4 | **Concurrencia entre el cron de captura y la lectura de dashboards** | El cron escribe noticias mientras los dashboards consultan agregados. |
| D-5 | **Capacidad real del equipo** | Cuatro integrantes, 2 h/día, factor de capacidad efectiva 0,6, y una ventana de doce semanas. El tiempo de aprendizaje compite directamente con el tiempo de entrega. |
| D-6 | **Carga operativa sobre DevOps y Calidad** | David Cortez concentra CI/CD, Docker, cobertura y calidad de código. Todo servicio que haya que administrar sale de su presupuesto de horas. |

---

## 3. Opciones consideradas

### 3.1 Backend

| Opción | A favor | En contra |
|---|---|---|
| **Python + FastAPI** *(elegida)* | Genera el documento OpenAPI automáticamente desde los modelos Pydantic (D-1); validación de entrada declarativa; ecosistema maduro de procesamiento de texto (D-2); `feedparser` es la librería de referencia para RSS. | Introduce un segundo lenguaje en el proyecto: el frontend seguirá siendo JavaScript/TypeScript. |
| **Python + Django** | Admin y ORM incluidos; ecosistema idéntico para D-2. | El panel de administración de la especificación es una vista de React, no el admin de Django; DRF exige configuración adicional para OpenAPI. Aporta estructura que este proyecto no usa. |
| **Node.js + Express** | Un solo lenguaje en todo el proyecto; alineado con los contenedores esqueleto ya existentes. | El documento OpenAPI se mantiene a mano (`swagger-jsdoc`) y se desincroniza del código, que es exactamente el riesgo que D-1 quiere evitar. Sin estructura de capas impuesta, R-1 a R-3 dependen solo de disciplina. |
| **Node.js + NestJS** | Un solo lenguaje; `@nestjs/swagger` genera OpenAPI desde decoradores; su estructura de módulos, servicios y repositorios refuerza R-1 a R-3. | Curva de aprendizaje propia (módulos, inyección de dependencias) que compite con Docker, CI/CD y OpenSpec en el mismo Sprint 0 (D-5). Procesamiento de texto en español menos servido que en Python (D-2). |

**Descarte de Express** por D-1. **Descarte de Django** por sobrecoste no utilizado. **NestJS quedó como la alternativa seria**: es la opción correcta si el equipo tuviera dominio claramente mayor de Node que de Python (ver secc. 5.3, riesgo R-1).

### 3.2 Gestor de datos

| Opción | A favor | En contra |
|---|---|---|
| **PostgreSQL** *(elegida)* | Relacional, que es la naturaleza de `MOD-01` (D-3): claves foráneas, asociativa N:M, unicidad compuesta e índices de agregación. Escrituras concurrentes sin bloqueo global (D-4). Se levanta como un servicio más de `docker-compose`, sin operación adicional. | Un contenedor y un volumen más que administrar respecto de SQLite. |
| **SQLite** | Cero configuración; recomendada por la especificación para prototipado; ideal para la suite de pruebas. | **Un único escritor por base de datos.** El cron de captura escribiendo mientras un dashboard consulta produce contención (`database is locked`), justo en el escenario de demostración. |
| **MongoDB** | Recomendada por la especificación para escalabilidad; flexible ante cambios de esquema. | `MOD-01` es un modelo relacional: obligaría a duplicar datos o a resolver a mano relaciones y unicidad compuesta que el gestor relacional garantiza. La flexibilidad de esquema no es un problema que este proyecto tenga. |

**Justificación exigida por la especificación (secc. 6.2):** se elige PostgreSQL porque el modelo de datos definido en `MOD-01` es relacional y porque el patrón de acceso previsto —escrituras periódicas del cron concurrentes con lecturas agregadas de los dashboards— es precisamente el que SQLite no resuelve bien. La escalabilidad que la especificación asocia a MongoDB se obtiene aquí sin renunciar a la integridad referencial.

### 3.3 Frontend

Se adopta **React sobre Vite con TypeScript**. React está recomendado por la especificación (secc. 6.2), Vite ya está implícito en el puerto `5173` configurado en `INFRA-02`, y TypeScript da verificación estática del contrato consumido desde la API. Angular y Vue se descartan por no aportar ventaja sobre React en este proyecto y por no estar alineados con el entorno ya montado.

Para el mapa se adopta **react-simple-maps** en lugar de Leaflet o Mapbox: la especificación pide colorear el humor **por continente** (secc. 4.3.2), que es una coropleta sobre un mapa vectorial, no un mapa de teselas con marcadores. Leaflet resolvería un problema que este proyecto no tiene, y Mapbox añadiría dependencia de un servicio externo con clave de API.

---

## 4. Decisión

**Se adopta el siguiente stack.**

| Capa / función | Tecnología | Rol |
|---|---|---|
| **Lógica de negocio y API** | Python 3.12 + FastAPI | Servicios de dominio y adaptador REST bajo `/api/v1` |
| **Validación y contratos** | Pydantic | Modelos de entrada y salida; origen del documento OpenAPI |
| **Acceso a datos** | SQLAlchemy 2.0 + Alembic | Repositorios y migraciones versionadas |
| **Gestor de datos** | PostgreSQL 16 | Persistencia de las entidades de `MOD-01` |
| **Captura RSS** | feedparser | Lectura y normalización de feeds |
| **Planificación** | APScheduler | Cron de captura y purgado, con periodicidad reconfigurable en caliente |
| **Presentación** | React + Vite + TypeScript | Dashboards y panel de administración |
| **Mapa** | react-simple-maps | Coropleta de humor por continente |
| **Gráficos** | Chart.js | Series temporales y comparativas |
| **Nube de palabras** | d3-cloud | Términos influyentes |
| **Pruebas backend** | pytest + pytest-cov | Unitarias e integración; medición de cobertura |
| **Pruebas frontend** | Vitest + Testing Library | Componentes y vistas |
| **Análisis estático** | SonarCloud | Calidad de código integrada en el pipeline |
| **Contenerización** | Docker + Docker Compose | Backend, frontend y base de datos |
| **CI/CD** | GitHub Actions | Pruebas, calidad y construcción de imágenes |

Las versiones exactas de cada dependencia se fijan en `requirements.txt` y `package.json`; este ADR fija las líneas mayores, no los parches.

### 4.1 Reglas normativas derivadas

- **S-1 — El contrato se genera, no se escribe.** El documento OpenAPI publicado en `/api/docs` se genera desde los modelos Pydantic y las firmas de los endpoints. **No se mantiene un fichero OpenAPI editado a mano.** Refuerza R-5 de `ADR-000`.
- **S-2 — El motor de sentimiento no depende del framework.** Recibe texto e idioma y devuelve un valor; no importa FastAPI, SQLAlchemy ni objetos de petición HTTP. Es la condición que hace verificable R-4 y alcanzable el 80 % de cobertura (C-3, C-5).
- **S-3 — Sin modelos de lenguaje en el motor de sentimiento.** El algoritmo es de diccionario de términos con valores (Especificación, secc. 10.4). La tokenización y la normalización se resuelven con la biblioteca estándar; **no se incorporan spaCy, NLTK con corpus descargables ni modelos de *transformers***, que multiplicarían el tiempo del pipeline de CI sin cambiar el resultado del algoritmo acordado. Si `ADR-001` decide otro algoritmo, esta regla se revisa allí.
- **S-4 — El acceso a datos vive en repositorios.** Los servicios no construyen consultas SQLAlchemy: las invocan a través de los módulos de `repositories/`. Es R-3 de `ADR-000` expresada en este stack.
- **S-5 — Toda alteración del esquema pasa por una migración de Alembic** versionada en el repositorio. No se modifica el esquema a mano en ningún entorno.

---

## 5. Consecuencias

### 5.1 Positivas

- El cumplimiento de C-2 deja de ser trabajo recurrente: el documento OpenAPI acompaña al código por construcción, y las tareas `SWG-S1` a `SWG-04` pasan de "escribir documentación" a "revisar lo generado".
- `MOD-01` se traduce directamente: las claves foráneas, la asociativa `NOTICIA_TERMINO`, la unicidad compuesta `(id_fuente, guid_origen)` y los índices previstos existen tal cual en PostgreSQL, sin reinterpretación.
- El purgado por caducidad y las agregaciones por continente y fecha se resuelven con consultas del propio gestor, en la capa de datos, como exige `ADR-000`.
- La regla S-2 hace que el motor de sentimiento sea la parte más testeable del sistema, que es justo donde la especificación exige el 80 % de cobertura.
- SonarCloud elimina de la carga de David la administración de un servidor de análisis.

### 5.2 Negativas y costes asumidos

- **El proyecto pasa a ser bilingüe:** Python en backend, TypeScript en frontend. José y Sebastián dejan de poder intercambiar código directamente; el punto de encuentro es el documento OpenAPI, no el lenguaje.
- **El `Dockerfile` del backend cambia** de `node:22-alpine` a una imagen de Python, y `docker-compose.yml` incorpora el servicio de PostgreSQL con su volumen. Es trabajo de `INFRA-02`, barato hoy porque los contenedores están vacíos, caro si se pospone.
- **Se añade un tercer contenedor.** El entorno local deja de levantar en dos servicios y pasa a tres.
- **Alembic introduce disciplina de migraciones** desde la primera entidad. Es coste real de aprendizaje, y es el precio de que el esquema sea reproducible.

### 5.3 Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | **El nivel de Python del equipo no fue verificado.** Al proponer este stack se planteó explícitamente que un dominio claramente mayor de Node debía invertir la decisión hacia NestJS. El equipo aceptó el stack sin que esa comprobación se registrara. | Alto: afectaría a José, que concentra la mayor carga de backend | Revisar el punto en la retrospectiva del Sprint 1. Si la velocidad de backend queda por debajo de lo planificado por causa del lenguaje, la corrección se toma **al cierre del Sprint 1**, no más tarde: a partir del Sprint 2 el coste de cambiar supera al de continuar. |
| R-2 | El servicio de PostgreSQL no arranca a tiempo en el pipeline y las pruebas de integración fallan de forma intermitente | Medio | Usar un *service container* de GitHub Actions con comprobación de salud, y esperar a que el servicio esté disponible antes de ejecutar las pruebas. |
| R-3 | Divergencia entre el esquema de Alembic y el modelo de `MOD-01` | Medio | Toda migración se revisa contra `MOD-01` en el *pull request*, según el criterio de documentación de la Definition of Done. |
| R-4 | Aparición de dependencias pesadas en el motor de sentimiento que ralenticen el pipeline | Bajo | Regla S-3. |

---

## 6. Cumplimiento del requisito de admisibilidad de ADR-000

`ADR-000`, secc. 7, exige que cualquier stack seleccionado permita cumplir cuatro condiciones:

| Requisito de `ADR-000` | Cómo lo cumple este stack |
|---|---|
| Reglas R-1 a R-6 | Estructura `api/` → `services/` → `repositories/` → `models/` ya adoptada en `ADR-000`, secc. 4.4, y reforzada por S-4. |
| OpenAPI en `/api/docs` bajo `/api/v1` | Generado por FastAPI desde Pydantic (S-1). |
| Lógica de negocio testeable sin base de datos | Regla S-2; el motor de sentimiento recibe texto e idioma en memoria. |
| Empaquetado en Docker | Imagen de Python para backend, imagen de Node para frontend, PostgreSQL oficial; orquestados con Docker Compose. |

---

## 7. Impacto sobre artefactos existentes

| Artefacto | Acción requerida | Responsable |
|---|---|---|
| `backend/Dockerfile` | Cambiar la imagen base de `node:22-alpine` a Python 3.12 | David Cortez (`INFRA-02`) |
| `opsx/docker-compose.yml` | Añadir el servicio PostgreSQL con volumen persistente y variables de entorno | David Cortez (`INFRA-02`) |
| `.github/workflows/ci.yml` | Añadir ejecución de `pytest` con cobertura, publicación a SonarCloud y *service container* de PostgreSQL | David Cortez (`CICD-00`) |
| `docs/uml/MOD-01-modelo-er-inicial.md` | Cerrar la decisión abierta n.º 3 (gestor de datos) | Matías Santos |
| `README.md` | Sustituir la fila "Pendiente — ADR-003" por el stack decidido | Matías Santos |
| `backend/README.md`, `frontend/README.md` | Actualizar cuando se cree la estructura de módulos | José Romero / Sebastián Márquez |

---

## 8. Trazabilidad

| Elemento de este ADR | Origen |
|---|---|
| Existencia y necesidad del ADR | `ADR-000`, secc. 7 y secc. 9, punto 2 |
| Requisito de justificar el gestor de datos | Especificación, secc. 6.2 |
| Tecnologías recomendadas evaluadas | Especificación, secc. 6.2 |
| Naturaleza relacional del modelo | `MOD-01`, secc. 3 a 5 |
| Concurrencia cron / dashboards | Especificación, secc. 4.2.3, 4.3.2 |
| Cobertura mínima del 80 % | Especificación, secc. 7 |
| Capacidad del equipo y ventana temporal | Planificación de Sprints v2, secc. 1 |
| Puerto 5173 y contenedores esqueleto | `INFRA-02`, `opsx/docker-compose.yml` |

---

## 9. Supuestos y puntos abiertos

1. **Punto abierto — este ADR no tiene tarea en Jira.** El plan de carga contempla `ADR-000`, `ADR-001` y `ADR-002`, pero no `ADR-003`, pese a que `ADR-000` lo propuso explícitamente y a que `INFRA-02` depende de él de hecho. Debe crearse el ítem correspondiente en el tablero HUM, dentro de la épica `EP-0`, y registrarse la desviación en el seguimiento del Sprint 0.
2. **Supuesto.** El equipo dispone de nivel suficiente de Python para desarrollar con FastAPI sin que el aprendizaje consuma capacidad planificada. Este supuesto **no fue verificado** antes de la decisión (ver riesgo R-1) y se contrasta en la retrospectiva del Sprint 1.
3. **Punto abierto.** La topología final de `docker-compose` —número de servicios, volúmenes y variables de entorno— se resuelve en `INFRA-02` bajo las decisiones de este ADR.
4. **Punto abierto.** La estrategia de datos de prueba (base efímera por ejecución frente a base compartida) se define junto con `QA-S1`.
5. **Dependencia hacia adelante.** `ADR-001` puede revisar la regla S-3 si el algoritmo de humor acordado deja de ser de diccionario.

---

## 10. Referencias

1. Especificación del Proyecto Final **HumWorld — ¿De qué humor está el mundo?**, Universidad Andrés Bello, curso 2026-27 (secc. 3, 4.2, 4.3, 4.6, 6.1, 6.2, 7, 10.1, 10.2, 10.3).
2. **ADR-000 — Arquitectura en tres capas**, secc. 4.2, 4.4, 7 y 9.
3. **MOD-01 — Modelo inicial de datos (E/R preliminar)**, secc. 3 a 5 y 8.
4. **Planificación de Sprints HumWorld v2** — secc. 1 (capacidad del equipo) y tabla detallada del Sprint 0.
5. **Plan de carga de Jira (HUM)** — épica `EP-0` y tabla de dependencias.
6. **Definition of Done v1.0** — criterios de documentación y de calidad aplicables a cada *pull request*.

---

## 11. Historial de revisiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 1.0 | 2026-08-25 | Matías Santos | Redacción inicial. Selección de FastAPI, PostgreSQL y React sobre Vite; reglas S-1 a S-5; registro del riesgo R-1 sobre la verificación no realizada del nivel de Python del equipo. Acordado por el equipo en la misma fecha. |
