## Context

- El backend ya cumple ADR-002 y su enmienda geográfica: `GET /api/v1/dashboards/noticias-influyentes` filtra por países atribuidos y devuelve como máximo 10 elementos ordenados (`dashboard-aggregation`, requisito "Ranking de noticias influyentes").
- El frontend ya consume el endpoint: `fetchInfluentialNews` en `features/dashboard/infrastructure/dashboardApi.ts` convierte `valor_humor` a número y `useDashboard` lo carga junto al resto de consultas con los mismos parámetros. `DashboardPage.tsx` pinta una `<ol>` inline con el titular como enlace externo y una línea `canal · pais|continente · humor`.
- Cada elemento ya trae todos los datos del detalle (`id_noticia`, `titulo`, `url`, `canal`, `continente`, `pais`, `fecha_registro`, `valor_humor`). No existe un endpoint de detalle de noticia.
- `formatHumor` en `features/dashboard/domain/countries.ts` ya produce el signo (`+`, `−`, `±`) con formato es-CL.

## Goals / Non-Goals

**Goals:**

- Cerrar `E3-H02` con un componente probado que cumpla C-V5 y el criterio de finalización.
- Reutilizar la carga, el filtro y los estados de carga/error que ya gestiona el dashboard.

**Non-Goals:**

- Desglose de términos por noticia o cualquier dato no incluido en la respuesta actual (requeriría un endpoint nuevo).
- Mostrar los países mencionados por cada noticia (la respuesta no los incluye y ADR-002 conserva la forma).
- Paginación, filtros avanzados u orden configurable.

## Decisions

### D1. Componente en `features/dashboard/presentation/`, no carpeta `features/news/`

`InfluentialNewsList.tsx` recibe `news: InfluentialNews[]` y `scopeTitle: string`. La API, el tipo y el hook ya viven en `features/dashboard`; crear `features/news/` (ADR-004 secc. 4.1) obligaría a mover o duplicar esa infraestructura sin beneficio. El mismo criterio ya se aplicó a la nube de palabras (`DashboardWordCloud`).
*Alternativa descartada:* mover API, tipo y hook a `features/news/`. Más diff y riesgo de romper `useDashboard` y sus pruebas.

### D2. Detalle expandible en línea con `<details>`/`<summary>`

Cada `<li>` contiene un `<details>` cuyo `<summary>` muestra posición, titular, canal y humor; el cuerpo muestra el detalle. Es nativo: teclado, foco y estado expandido (`open`) sin JavaScript ni estado React.
*Alternativas descartadas:* modal/drawer (más código, gestión de foco y escape, y tapa el resto del dashboard); ruta `/dashboard/noticias/:id` (no hay endpoint de detalle y perdería el filtro vigente).

### D3. Enlace original solo con `http`/`https`

Se conserva la regla actual (`/^https?:\/\//i`) como función pura `safeNewsUrl(url): string | null` en `features/dashboard/domain/`, para probarla sin DOM. El enlace usa `target="_blank"` y `rel="noopener noreferrer"`. Evita `javascript:` u otros esquemas provenientes de feeds RSS.

### D4. Polaridad con signo, color y texto

Se reutiliza `formatHumor` para el signo. La clase `pos`/`neg`/`neu` usa los tokens existentes `--pos`/`--neg`, y el detalle añade el texto "Positiva"/"Negativa"/"Neutra" para no depender solo del color. Umbral neutro: el mismo que `formatHumor` (|v| < 0,005).

### D5. Etiqueta "Fuente"

El detalle rotula `canal` y `pais ?? continente` bajo "Fuente". El nombre del país se resuelve con `COUNTRIES_BY_ISO` y, si el código no está en el catálogo visual reducido, se muestra el código ISO tal cual.

### D6. Fecha en UTC

`fecha_registro` se formatea con `Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })` y sufijo "UTC", coherente con el corte UTC que ya declara el dashboard.

## Risks / Trade-offs

- [El catálogo visual de países es reducido] → se muestra el código ISO como respaldo; ampliar el catálogo queda fuera de esta historia.
- [Titulares largos rompen el `<summary>`] → recorte visual con CSS (`overflow-wrap`) y titular completo en el detalle.
- [Issue #67 cerrado sin prueba nueva] → la tarea exige revisar explícitamente que la prueba PostgreSQL cubre límite de 10 y desempate por fecha desc e `id_noticia` asc; si falta un caso, se agrega.
