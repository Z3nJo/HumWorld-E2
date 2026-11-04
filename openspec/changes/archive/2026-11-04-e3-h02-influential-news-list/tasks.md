## 1. Preparación

- [x] 1.1 Crear la rama `feat/e3-h02-influential-news-list` desde `main` actualizado
- [x] 1.2 Revisar `backend/tests/test_dashboards_postgresql.py` y confirmar que cubre límite de 10, desempate por `fecha_registro` descendente e `id_noticia` ascendente y lista vacía (C-V2, C-V3); si falta un caso, añadir la prueba de integración

## 2. Dominio

- [x] 2.1 Escribir pruebas de `safeNewsUrl` (http, https, mayúsculas, `javascript:`, relativa, vacía) en `features/dashboard/domain/`
- [x] 2.2 Implementar `safeNewsUrl(url): string | null` y una función de polaridad (`pos`/`neg`/`neu`) con el mismo umbral que `formatHumor`

## 3. Componente

- [x] 3.1 Escribir `InfluentialNewsList.test.tsx`: orden recibido con positiva antes que negativa más intensa, posición 1..n, signo visible, detalle abre/cierra, campos del detalle, fecha UTC, etiqueta "Fuente" con país y con continente, enlace seguro con `rel="noopener noreferrer"`, URL no navegable y estado vacío
- [x] 3.2 Implementar `features/dashboard/presentation/InfluentialNewsList.tsx` con `<details>`/`<summary>` según design.md (D2–D6)
- [x] 3.3 Añadir estilos en `Dashboard.css` reutilizando `--pos`/`--neg`, sustituyendo las reglas `.influential-news` actuales

## 4. Integración en el dashboard

- [x] 4.1 Reemplazar la `<ol>` inline de `DashboardPage.tsx` por `<InfluentialNewsList news={news?.noticias ?? []} scopeTitle={scopeTitle} />`
- [x] 4.2 Ajustar `DashboardPage.test.tsx` para verificar que el ranking se consulta con el filtro vigente y se vuelve a consultar al cambiar continente o día

## 5. Verificación y cierre

- [x] 5.1 Ejecutar `pnpm run lint`, `pnpm test` y `pnpm run build` en `frontend/`
- [x] 5.2 Ejecutar `pytest --cov=. --cov-report=term-missing --cov-fail-under=80` en `backend/` si se modificó alguna prueba
- [x] 5.3 Validar manualmente con el stack Docker: top 10 por ámbito Global, continente y país; detalle y enlace original
- [x] 5.4 Redactar `docs/sprints/e3-h02-evidencia-validacion.md` con C-V1..C-V6 de ADR-002 y el criterio de finalización
- [ ] 5.5 Referenciar el cierre del issue #67 en el PR y ejecutar `openspec validate e3-h02-influential-news-list --strict`
