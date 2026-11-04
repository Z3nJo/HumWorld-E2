## 1. Curación reproducible del catálogo

- [x] 1.1 Fijar revisiones concretas de VADER y ML-SentiCon, registrar en `backend/app/seeds/sentiment.py` sus URLs, licencias, transformaciones de escala y criterios de filtrado, y verificar manualmente que la atribución identifica cada entrada externa utilizada.
- [x] 1.2 Generar fuera del runtime las entradas candidatas, aplicar normalización, exclusión de valores neutros o incompatibles, prioridad de los 30 pares actuales y deduplicación por identidad y forma de coincidencia; verificar que el resultado contiene al menos 4.000 identidades únicas `es` y 4.000 `en`, todas reproducibles desde las revisiones fijadas.

## 2. Ampliación del seed

- [x] 2.1 Mantener `SENTIMENT_LEXICON` con sus 30 pares originales e incorporar el catálogo extendido ordenado como datos inmutables dentro de `backend/app/seeds/sentiment.py`; verificar mediante una carga del módulo que no se requiere red ni un archivo adicional.
- [x] 2.2 Combinar las entradas originales y extendidas con prioridad para las originales e insertar el conjunto en lotes acotados dentro de una única transacción; verificar con una prueba de fallo controlado que cualquier excepción provoca rollback y que una ejecución correcta realiza un solo commit final.

## 3. Pruebas del catálogo y la persistencia

- [x] 3.1 Actualizar `backend/tests/test_sentiment_seed.py` para conservar la comprobación de los 30 pares base y validar conteos mínimos por idioma, orden determinista, identidades y formas normalizadas únicas, idiomas admitidos, longitud, finitud, rango y precisión; verificar que el archivo de pruebas pasa sin acceso de red.
- [x] 3.2 Actualizar las pruebas del seed en `backend/tests/test_news_sentiment_postgresql.py` para derivar el conjunto exacto esperado del catálogo, comprobar la carga limpia de todas las filas, repetir la inicialización sin duplicados y preservar el valor y estado editados por un administrador; verificar los escenarios contra PostgreSQL.
- [x] 3.3 Añadir cobertura de inserción por lotes y rollback atómico sin modificar pruebas de reconocimiento, cálculo, API o frontend; verificar que los casos nuevos fallan si un lote se confirma parcialmente o si se reemplaza una fila existente.

## 4. Validación de alcance y entrega

- [x] 4.1 Ejecutar las pruebas unitarias del seed y las pruebas PostgreSQL pertinentes, registrar conteos finales por idioma y tiempo total, y verificar que no existen fallos ni dependencias de red.
- [x] 4.2 Ejecutar la suite backend de sentimiento aplicable y `openspec validate expand-sentiment-seed-catalog --strict`; verificar que el motor, las fórmulas, la API y la semántica de instantáneas históricas conservan sus regresiones existentes.
- [x] 4.3 Revisar el diff final y verificar que el único código de producción modificado es `backend/app/seeds/sentiment.py`, que los demás cambios ejecutables se limitan a las pruebas del seed acordadas y que no se añadieron migraciones, dependencias, datos externos ni cambios de contrato ajenos a esta propuesta.
