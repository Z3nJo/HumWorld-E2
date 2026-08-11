# Requisitos resumidos

## Alcance

- El sistema procesara exclusivamente fuentes RSS.
- No se realizara web scraping.
- Los idiomas soportados para analisis seran espanol e ingles.
- La aplicacion tendra interfaz web y API REST.
- No se implementara autenticacion en la fase inicial.

## Funcionalidades principales

- Gestion de fuentes RSS.
- Carga inicial de fuentes por continente.
- Captura automatica mediante cron configurable.
- Actualizacion manual de una o varias fuentes RSS.
- Gestion CRUD del diccionario de palabras evaluables.
- Calculo y persistencia del valor de humor por noticia.
- Dashboard de humor global y regional.
- Nube de palabras influyentes.
- Listado de noticias mas influyentes.
- Gestion de parametros generales mediante `/config`.
- Purgado automatico y manual de noticias antiguas.

## Endpoints minimos previstos

- `GET, POST, PUT, PATCH, DELETE /api/v1/sources`
- `GET, DELETE /api/v1/news`
- `GET, POST, PUT, PATCH, DELETE /api/v1/dictionary`
- `GET, PUT /api/v1/config`
- `POST /api/v1/sentiment`
- `GET /api/v1/dashboards`
