# Tasks

## 1. Persistencia y configuración

- [x] 1.1 Crear la migración y el modelo `NOTICIA_TERMINO` con clave compuesta, integridad de ocurrencias, aporte `NUMERIC(8,2)` y cascada desde noticia; verificar en PostgreSQL migrado que se insertan aportes y que el borrado de una noticia los elimina sin borrar términos desactivados.
- [x] 1.2 Ajustar `NOTICIA.valor_humor` a tres decimales, añadir la restricción `[-1, 1]` y el índice de pendientes por `fecha_analisis IS NULL`; verificar la migración con datos previos compatibles y una consulta de selección de pendientes.
- [x] 1.3 Incorporar los cuatro parámetros de ADR-001 mediante inicialización idempotente y un resolvedor validado; verificar en PostgreSQL que las claves existen con sus tipos y valores por defecto, y que una segunda ejecución conserva valores ya modificados.
- [x] 1.4 Comprobar en el arranque la escala frente al diccionario y registrar la advertencia P-4; verificar con pruebas que se advierte ante discrepancia y que un diccionario vacío no causa una advertencia espuria.

## 2. Motor de análisis

- [x] 2.1 Implementar el reconocedor intercambiable sobre título y descripción con comparación de tokens completos insensible a mayúsculas y tildes, filtro por idioma y estado activo; verificar con pruebas de repeticiones, frases, texto sin descripción y exclusión de subcadenas.
- [x] 2.2 Implementar con `Decimal` las tres fórmulas de ADR-001 y los aportes por término, recibiendo parámetros explícitos; verificar con pruebas unitarias el ejemplo `-0,475`, cancelación a cero, ausencia de términos, fórmulas alternativas y redondeo `ROUND_HALF_UP`.
- [x] 2.3 Rechazar valores reconocidos fuera de `[-10, 10]`, con más de un decimal efectivo, o resultados inválidos sin recortarlos; verificar con pruebas de límites y propiedad que el promedio ponderado con escala `10` permanece en `[-1, 1]` y que el motor no requiere HTTP ni base de datos.

## 3. Captura y recuperación de pendientes

- [x] 3.1 Adaptar el repositorio de captura para devolver noticias realmente insertadas y ceder el `commit` a una unidad de trabajo por fuente; verificar con pruebas PostgreSQL la deduplicación y el rollback sin alterar el conteo ni la fecha de última captura existentes.
- [x] 3.2 Integrar el análisis de noticias nuevas en la captura manual y programada, con una instantánea de términos y parámetros por fuente; verificar que humor, fecha y aportes se confirman juntos, que un fallo revierte solo esa fuente y que la respuesta HTTP conserva sus campos.
- [x] 3.3 Añadir la recuperación programada de noticias anteriores en lotes sobre `fecha_analisis IS NULL`, con exclusión concurrente de filas y límite por ejecución; verificar en PostgreSQL que procesa pendientes previos, no repite noticias analizadas sin términos y no altera resultados históricos tras cambios del diccionario.

## 4. Integración

- [x] 4.1 Ejecutar la batería de backend y una prueba de captura completa sobre PostgreSQL migrado; verificar que el humor ponderado se reconstruye desde `NOTICIA_TERMINO`, que el endpoint manual conserva su contrato y que el pipeline cumple su umbral de cobertura.

## Condición externa de cierre de E2-H02

La implementación puede quedar lista para las tareas dependientes al completar las casillas anteriores. E2-H02 permanece abierta y este cambio no debe archivarse hasta que los responsables del protocolo de ADR-001 ejecuten V-0 a V-5 y publiquen el informe exigido por C-V9. El etiquetado V-1 y la comparación entre idiomas V-4 incluyen trabajo de José Romero; la publicación del informe y su enlace desde el ADR corresponden a Matías Santos. Si no se dispone del corpus y diccionario poblado en Sprint 2, los responsables registran el traslado de la validación al Sprint 3, conforme al ADR.
