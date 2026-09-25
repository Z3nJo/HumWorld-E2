# Tasks

## 1. Contrato de solicitud y respuesta

- [x] 1.1 Definir esquemas de entrada y salida para `texto` (1–10.000 caracteres), `idioma` (`es`/`en`), valor nullable y desglose canónico; verificar validación de espacios, longitud, idioma y estructura con pruebas unitarias de esquemas.
- [x] 1.2 Publicar modelos y códigos de respuesta `200`, `400` y `500` en OpenAPI; verificar `/api/openapi.json` y `/api/docs` mediante pruebas de contrato.

## 2. Servicio de análisis reutilizable y de solo lectura

- [x] 2.1 Proveer términos activos del idioma solicitado desde la capa de repositorio y coordinar su análisis con la configuración y el motor existentes, sin duplicar normalización ni fórmula; verificar ambos idiomas y que parámetros vigentes lleguen al motor con pruebas unitarias.
- [x] 2.2 Mapear contribuciones a términos canónicos con identificador, palabra, valor, ocurrencias y aporte, preservando `null` sin coincidencias y `0` neutral; verificar el desglose y los límites de cálculo con pruebas unitarias del servicio.
- [x] 2.3 Confirmar que el caso de uso solo lea diccionario y configuración y no invoque escrituras de noticias o aportes; verificarlo con repositorios falsos que fallen ante cualquier escritura.

## 3. Endpoint y comportamiento HTTP

- [x] 3.1 Exponer `POST /api/v1/sentiment` siguiendo los routers existentes y conectar el servicio de análisis; verificar respuestas `200`, validación `400`, manejo estándar de errores `500` y ausencia de escrituras mediante pruebas API.
- [x] 3.2 Cubrir por API análisis con términos en español e inglés, ausencia de coincidencias, neutralidad, idioma omitido/no soportado, texto vacío/de espacios y límite de 10.000 caracteres; verificar los cuerpos y códigos de respuesta esperados.

## 4. Contrato OpenSpec entregable

- [x] 4.1 Sincronizar primero el delta E2-H04 en la especificación base mediante OpenSpec, sin archivar el cambio; extender `opsx/sync_contracts.py` para incluir `news-sentiment-analysis`, generar `opsx/contracts/news-sentiment-analysis/spec.md` y verificar sincronización y detección de diferencias con los modos normal y `--check`.

## 5. Paridad e integración final

- [x] 5.1 Añadir una prueba de integración PostgreSQL que analice por API el texto e idioma de una noticia ya procesada y compare el valor y desglose con lo persistido, conforme a C-V5; verificar que ambas vías usan el mismo resultado.
- [x] 5.2 Ejecutar la suite backend pertinente, `python opsx/sync_contracts.py --check` y `openspec validate e2-h04-sentiment-endpoint --strict`; verificar que las pruebas pasan, el contrato está sincronizado y el cambio OpenSpec valida.
