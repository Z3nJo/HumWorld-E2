## Why

El léxico inicial actual contiene solo 30 pares bilingües y deja gran parte del vocabulario emocional de las noticias sin cobertura. HumWorld necesita ampliar sustancialmente ese catálogo inicial con datos reproducibles y validados, sin cambiar el motor de sentimiento ni los contratos existentes del sistema.

## What Changes

- Ampliar el seed inicial hasta incluir al menos 4.000 términos activos en español y 4.000 en inglés, conservando los 30 pares curatoriales actuales.
- Incorporar términos puntuados procedentes de léxicos públicos de sentimiento, filtrados para que sean compatibles con los idiomas, límites y precisión ya aceptados por HumWorld.
- Mantener la inicialización idempotente: una segunda ejecución no duplica términos ni reemplaza valores o estados modificados por un administrador.
- Mantener sin cambios el reconocimiento, las fórmulas, la persistencia, el modelo de datos, la API, el frontend y la política de no recalcular noticias históricas.
- Actualizar exclusivamente las pruebas unitarias y PostgreSQL del seed para validar tamaño, unicidad, valores, normalización, idempotencia y preservación de cambios administrativos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `news-sentiment-analysis`: ampliar el requisito del léxico inicial bilingüe desde aproximadamente 30 pares hasta miles de términos de sentimiento válidos por idioma, sin cambiar cómo se reconocen o calculan sus aportes.

## Impact

- Código de producción afectado: `backend/app/seeds/sentiment.py` únicamente.
- Pruebas afectadas: `backend/tests/test_sentiment_seed.py` y las verificaciones del seed en `backend/tests/test_news_sentiment_postgresql.py`.
- No se añaden migraciones, tablas, columnas, endpoints, parámetros, dependencias de ejecución ni descargas de red durante el arranque.
- El catálogo ampliado solo participa en análisis futuros o todavía pendientes; las noticias ya analizadas conservan su instantánea histórica.
