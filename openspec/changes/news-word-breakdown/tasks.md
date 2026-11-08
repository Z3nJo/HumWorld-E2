## 1. Backend

- [ ] 1.1 Repositorio `news_term_breakdown(news_id)`: orden por `ABS(aporte_humor)` desc y `palabra` asc; `None` si la noticia no existe o no fue analizada. Verificar con pruebas de integración PostgreSQL (orden, término desactivado, término editado, noticia inexistente).
- [ ] 1.2 Servicio `get_news_breakdown`: deriva `valor` y lanza `ResourceNotFoundError`. Verificar con pruebas unitarias.
- [ ] 1.3 Ruta `GET /api/v1/dashboards/noticias/{id}/terminos` con `SentimentResponse`. Verificar 200, 404, 400 y publicación en OpenAPI.

## 2. Frontend

- [ ] 2.1 Tipos y `fetchNewsBreakdown` con conversión de decimales a `number`.
- [ ] 2.2 Hook `useNewsBreakdown` y `NewsBreakdownPanel` (`<dialog>`), con carga, error y reintento.
- [ ] 2.3 Botón "Ver desglose de palabras" en `InfluentialNewsList` y estilos del panel.

## 3. Cierre

- [ ] 3.1 Aplicar deltas en `openspec/specs/`, regenerar `opsx/contracts/` y archivar el cambio.
- [ ] 3.2 Ejecutar `sync_contracts.py --check`, pytest con cobertura, lint, tests y build del frontend.
