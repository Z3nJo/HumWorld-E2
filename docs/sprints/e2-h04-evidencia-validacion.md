# Evidencia de validacion E2-H04

Fecha de revalidacion local: 2026-09-28, sobre `main` en `52349a6` (Docker Compose y
PostgreSQL 16). La historia se integro con los PR #35 a #38; el ultimo se fusiono el 2026-09-25.

## Alcance implementado

Se expuso el endpoint `POST /api/v1/sentiment` para analisis puntual de sentimiento sobre
texto libre sin persistencia en base de datos:

- **Contrato de entrada:** JSON con `texto` (de 1 a 10.000 caracteres, no blanco) e `idioma`
  (`es` o `en`). Rechazo explicito de texto vacio, exceso de longitud o idioma no soportado
  con codigo `400 Bad Request` y mensaje de dominio estructurado, sin truncar texto.
- **Paridad algoritmica total:** reutiliza exactamente el mismo servicio de dominio
  (`SentimentAnalysisService`), reconocedor (`ExactTermRecognizer`) y motor de calculo
  (`calculate_sentiment`) que el procesamiento de noticias de E2-H02.
- **Contrato de respuesta:** codigo `200 OK` con:
  - `valor_humor`: decimal redondeado a 3 posiciones con la escala vigente, o `null` si no
    se reconocieron terminos;
  - `terminos`: lista de terminos canonicos reconocidos con `id_termino`, `palabra`, `valor`,
    `ocurrencias` y `aporte_humor` redondeado a 2 decimales.
- **Sin efectos secundarios:** operacion de solo lectura. No crea noticias, no modifica tablas
  ni persiste historial alguno.
- **Distincion semantica:** cuando no se reconocen terminos, responde `valor_humor: null` y
  `terminos: []`; ante cancelacion exacta entre terminos positivos y negativos responde
  `valor_humor: "0.000"` y la lista de terminos que sustentan la neutralidad.
- **Serializacion decimal:** `valor_humor`, `valor` y `aporte_humor` se devuelven como cadenas
  JSON (`"0.667"`, `"8.0"`, `"8.00"`) para conservar la precision exacta de `Decimal`.
- **Documentacion OpenAPI:** publicado en `/api/docs` con esquemas y ejemplos completos,
  sin emitir codigos `422`.

## Pruebas unitarias y de contrato

Se ejecuto la suite del endpoint y de verificacion del esquema OpenAPI:

```text
pytest tests/test_sentiment_api.py tests/test_openapi.py -q
14 passed, 1 warning in 0.61s
```

La suite valida:

- respuesta `200` con `valor_humor` y desglose de terminos canonicos;
- devolucion de `null` ante ausencia de terminos reconocidos;
- distincion entre neutralidad (`0.0`) y ausencia de coincidencia;
- rechazo con `400` para texto vacio, texto de solo espacios o mayor a 10.000 caracteres;
- rechazo con `400` para idioma no soportado (`fr`, `de`, etc.);
- publicacion correcta del endpoint en la especificacion OpenAPI bajo `/api/v1/sentiment`.

## Validacion en Docker Compose

Con el entorno levantado sobre una base limpia (seed inicial de 60 terminos), se ejecutaron
solicitudes HTTP contra `http://localhost:3000`. Las respuestas se transcriben tal como las
devolvio el servidor, en una sola linea.

### 1. Analisis con terminos reconocidos en espanol

```bash
curl -s -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" \
  -d '{"texto": "El progreso y la paz generan gran alegría", "idioma": "es"}'
```

Respuesta `200 OK`:

```json
{"valor_humor":"0.667","terminos":[{"id_termino":1,"palabra":"alegría","valor":"8.0","ocurrencias":1,"aporte_humor":"8.00"},{"id_termino":11,"palabra":"progreso","valor":"6.0","ocurrencias":1,"aporte_humor":"6.00"},{"id_termino":13,"palabra":"paz","valor":"6.0","ocurrencias":1,"aporte_humor":"6.00"}]}
```

Calculo: `(8.0 + 6.0 + 6.0) / (10 * 3) = 20.0 / 30 = 0.667`.

### 2. Analisis en ingles con flexiones

```bash
curl -s -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" \
  -d '{"texto": "The economic crises and wars brought deep poverty", "idioma": "en"}'
```

Respuesta `200 OK`:

```json
{"valor_humor":"-0.767","terminos":[{"id_termino":40,"palabra":"crisis","valor":"-6.0","ocurrencias":1,"aporte_humor":"-6.00"},{"id_termino":42,"palabra":"war","valor":"-9.0","ocurrencias":1,"aporte_humor":"-9.00"},{"id_termino":52,"palabra":"poverty","valor":"-8.0","ocurrencias":1,"aporte_humor":"-8.00"}]}
```

`crises` y `wars` mapearon a sus terminos canonicos `crisis` y `war`.
Calculo: `(-6.0 - 9.0 - 8.0) / (10 * 3) = -23.0 / 30 = -0.767`.

### 3. Neutralidad frente a ausencia de terminos

```bash
curl -s -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" -d '{"texto": "paz y crisis", "idioma": "es"}'
# {"valor_humor":"0.000","terminos":[{"id_termino":13,"palabra":"paz","valor":"6.0","ocurrencias":1,"aporte_humor":"6.00"},{"id_termino":39,"palabra":"crisis","valor":"-6.0","ocurrencias":1,"aporte_humor":"-6.00"}]}

curl -s -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" -d '{"texto": "Hola mundo", "idioma": "es"}'
# {"valor_humor":null,"terminos":[]}
```

Ambas respuestas fueron `200 OK`.

### 4. Validacion de errores

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" -d '{"texto": "   ", "idioma": "es"}'
# 400

curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/v1/sentiment \
  -H "Content-Type: application/json" -d '{"texto": "Hola mundo", "idioma": "de"}'
# 400
```

## OpenSpec y contratos

```text
openspec validate news-sentiment-analysis --strict
Specification 'news-sentiment-analysis' is valid

python opsx/sync_contracts.py --check
OpenSpec contracts are synchronized
```
