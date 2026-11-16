## Why

En "Noticias más influyentes" el usuario ve el `valor_humor` de cada noticia, pero no sabe qué palabras lo producen. `noticia_termino` ya guarda `ocurrencias` y `aporte_humor` por noticia, así que el desglose se puede mostrar sin migraciones.

## What Changes

- Incorporar `GET /api/v1/dashboards/noticias/{id}/terminos`, que devuelve el `valor_humor` guardado de la noticia y sus términos detectados (`palabra`, `valor`, `ocurrencias`, `aporte_humor`), de mayor a menor impacto.
- Responder `404` si la noticia no existe o no fue analizada, y `400` si el id no es numérico.
- Agregar en el detalle de cada noticia influyente el botón "Ver desglose de palabras", que abre un panel lateral con la tabla `Palabra | Valor | Veces | Aporte`.
- No se modifica ningún endpoint ni esquema existente; `GET /noticias-influyentes` queda igual.

## Capabilities

### Modified Capabilities

- `dashboard-aggregation`: nueva operación de desglose de términos por noticia.
- `frontend/influential-news-ui`: panel lateral con el desglose de palabras.

## Impact

- Backend: `app/repositories/dashboards.py`, `app/services/dashboards.py`, `app/api/dashboards.py` y sus pruebas. Sin migración ni schemas nuevos (reutiliza `SentimentResponse`).
- Frontend: `features/dashboard` (tipos, `fetchNewsBreakdown`, `useNewsBreakdown`, `NewsBreakdownPanel`, `InfluentialNewsList`, estilos).
- Contratos: `opsx/contracts/` se regenera con `sync_contracts.py`.
- Dependencia: la capacidad `frontend/influential-news-ui` proviene del cambio `e3-h02-influential-news-list`, aún sin archivar en esta rama.
