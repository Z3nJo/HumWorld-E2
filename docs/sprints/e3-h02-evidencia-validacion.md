# E3-H02 — Evidencia de validación

Historia: listado de noticias influyentes (top 10) con detalle. Cierra el issue #67. Criterios C-V1..C-V6 de ADR-002.

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| C-V1 orden por `|valor_humor|` desc | `test_dashboards_postgresql.py`, `test_dashboard_evolution.py` | Existente |
| C-V2 desempate por `fecha_registro` desc e `id_noticia` asc | `test_influential_news_orders_ties_by_date_desc_then_id_asc_and_empty` (nuevo) | Ejecutado contra PostgreSQL: 278 pruebas OK |
| C-V3 máximo 10 y lista vacía | `test_influential_news_deduplicates_before_limit_with_ties_and_range` (límite) y el test nuevo (vacío) | Ejecutado contra PostgreSQL: 278 pruebas OK |
| C-V4 nulos, ventana y ámbito | Pruebas existentes de `test_dashboards_postgresql.py` | Existente |
| C-V5 frontend respeta orden y signo | `InfluentialNewsList.test.tsx`, `DashboardPage.test.tsx` | `pnpm test`: 185 pruebas OK |
| C-V6 documentación del endpoint | Sin cambios de contrato en esta historia | N/A |

## Verificación

- `pnpm run lint`, `pnpm test`, `pnpm run build` en `frontend/`: OK.
- `openspec validate e3-h02-influential-news-list --strict`: válido.
- `pytest --cov=. --cov-report=term-missing --cov-fail-under=80` en `backend/`: **OK** — 278 pruebas, cobertura 97.07 % (umbral 80 %). Corrido contra `humworld_test` con la migración `20261027_01` aplicada.
- Validación del endpoint con el stack Docker (rango `2020-01-01`..`2026-12-31`):
  - Global: 10 noticias, orden por `|valor_humor|` descendente respetado, sin URLs duplicadas.
  - Continente `America`: 6 noticias; `Europa`: 10 noticias. Todas las URLs usan `http`/`https`.
  - País `DE` (Europa): 1 noticia; `BR` (America): 4; `US` (America): 1. `pais` sin `continente` responde `400` "pais requiere el filtro continente".
  - El campo `pais` de cada noticia es la procedencia editorial del canal; hoy los 6 canales semilla tienen `pais` nulo, así que el escenario "Fuente con país" no se puede observar con los datos actuales (solo cubierto por `InfluentialNewsList.test.tsx`).
- Contenedor `frontend` reconstruido (`docker compose build frontend`) para servir el código de esta historia en `http://localhost:5173`; el dashboard compila sin errores.
- Confirmación en navegador (Chromium headless contra `http://localhost:5173/dashboard`, ventana de 1 día):
  - Global: 10 noticias con posición 1..10, signo explícito (`−1,00`, `+0,80`) y polaridad `neg`/`pos`.
  - Continente `Europa`: recarga `continente=Europa` y muestra 10 noticias reordenadas según el backend.
  - País `Alemania`: recarga `continente=Europa&pais=DE` y muestra 1 noticia; el encabezado pasa a "Alemania".
  - Detalle: se abre y se cierra con el mismo control; muestra titular completo, humor con polaridad, fecha `27-10-26, 22:55 UTC`, fuente `Deutsche Welle · Europa` y el enlace original con `target="_blank"` y `rel="noopener noreferrer"`.
  - Estado vacío: `Italia`, `España` y `Francia` muestran "Sin noticias evaluables" sin elementos de ranking.
  - Sin errores de página en consola durante todo el recorrido.
