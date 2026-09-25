# Proposal

## Why

HumWorld ya calcula el humor de noticias con un motor compartido, pero no ofrece una forma de consultar el resultado para un texto puntual. E2-H04 expone ese análisis por API para permitir verificar el algoritmo y reutilizarlo sin crear ni modificar noticias.

## What Changes

- Exponer `POST /api/v1/sentiment` para recibir un texto no vacío y su idioma (`es` o `en`).
- Limitar el texto a 10.000 caracteres; rechazar entradas inválidas con `400` y nunca truncarlas.
- Reutilizar el reconocedor bilingüe, el cálculo y los parámetros existentes de E2-H02/E2-H03.
- Responder con `valor_humor` y el desglose canónico de términos reconocidos, sin persistir el texto ni el análisis. Si no hay términos, devolver `valor_humor: null` y `terminos: []`; conservar `0` cuando los aportes reconocidos se cancelen.
- Publicar el contrato del endpoint en OpenAPI bajo `/api/v1`, mantener sincronizada en `opsx/` la copia entregable de `news-sentiment-analysis` y comprobar que analizar el texto de una noticia procesada devuelve el mismo humor persistido.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `news-sentiment-analysis`: añadir el análisis por API de texto puntual en español o inglés, con valor y desglose, sin persistencia.

## Impact

- API backend: nuevo router, esquemas de solicitud/respuesta y servicio de aplicación para coordinar repositorios existentes, configuración y motor de sentimiento.
- Datos: lecturas del diccionario y de parámetros; no se añaden tablas, migraciones ni escrituras de análisis.
- Contrato: documentación OpenAPI para la operación, los esquemas y las respuestas `200`, `400` y `500`.
- Entregable OpenSpec: ampliar `opsx/sync_contracts.py` para generar y comprobar la copia de `news-sentiment-analysis` en `opsx/contracts/`, sin editar manualmente los archivos generados.
- Verificación: pruebas de servicio/API y una prueba de integración que contraste el valor del endpoint con el de una noticia ya analizada.
