## Why

`E3-H02` sigue abierta: el backend ya entrega el ranking de noticias influyentes con el criterio de ADR-002 y la atribución geográfica por países mencionados, pero el dashboard solo muestra una lista mínima de titulares sin detalle ni verificación del criterio C-V5. El criterio de finalización exige que "la lista muestra el top 10 según el filtro vigente y permite acceder al detalle de cada noticia", y la historia debe cerrar en el Sprint 4.

## What Changes

- Extraer la sección "Noticias más influyentes" de `DashboardPage` a un componente propio de la funcionalidad de dashboard, consumiendo el estado que ya carga `useDashboard`.
- Mostrar hasta 10 noticias en el orden recibido del backend, con su posición (1–10), titular, canal, fecha de registro y `valor_humor` con signo y color, sin reordenar ni filtrar en el cliente (ADR-002, I-5).
- Permitir abrir el detalle de cada noticia dentro del dashboard: titular completo, valor de humor con signo y polaridad, fecha y hora de registro (UTC), canal y procedencia editorial, y un enlace a la noticia original solo cuando la URL sea `http`/`https`.
- Rotular `canal`, `continente` y `pais` del elemento como procedencia editorial (fuente), no como país mencionado, de acuerdo con la enmienda geográfica de ADR-002.
- Mantener el estado vacío cuando el filtro vigente no tiene candidatas.
- Añadir pruebas de componente para el orden recibido, el signo visible, el detalle, el enlace seguro y el estado vacío (C-V5).
- Verificar que las pruebas de integración en PostgreSQL ya cubren desempate y límite de 10 (C-V2, C-V3) y cerrar el issue #67; completar la prueba solo si falta algún caso.
- Registrar la evidencia de validación de `E3-H02`.

## Capabilities

### New Capabilities

- `frontend/influential-news-ui`: presentación en el dashboard del top 10 de noticias influyentes del filtro vigente y acceso al detalle de cada noticia.

### Modified Capabilities

Ninguna. El contrato `GET /api/v1/dashboards/noticias-influyentes` de `dashboard-aggregation` no cambia.

## Impact

- Frontend: `frontend/src/pages/Dashboard/DashboardPage.tsx`, nuevo componente en `frontend/src/features/dashboard/presentation/`, estilos en `Dashboard.css` y sus pruebas Vitest.
- Backend: sin cambios de código. Posible ampliación de `backend/tests/test_dashboards_postgresql.py` si falta cobertura de C-V2/C-V3.
- API y contratos (`opsx/`): sin cambios.
- Documentación: `docs/sprints/e3-h02-evidencia-validacion.md`.
- Sin migraciones, dependencias nuevas ni cambios en Docker.
