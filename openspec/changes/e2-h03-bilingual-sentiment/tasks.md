# Tasks

## 1. Reconocimiento bilingüe de términos

- [x] 1.1 Extender la normalización determinista para formas comunes de español e inglés, resolviendo cada coincidencia a su término canónico; verificar con pruebas unitarias casos regulares e irregulares representativos y límites de palabra.
- [x] 1.2 Cubrir con pruebas unitarias mayúsculas, tildes, conteo de ocurrencias, idioma coincidente, idioma cruzado, términos inactivos y noticias sin descripción; ejecutar las pruebas del motor de sentimiento.

## 2. Léxico inicial e inicialización segura

- [ ] 2.1 Definir aproximadamente 30 pares de conceptos español/inglés con valores comparables y estados activos conforme al rango y precisión de ADR-001; verificar que cada par y valor tenga revisión documentada en el propio seed o sus pruebas.
- [ ] 2.2 Incorporar los términos faltantes mediante inicialización idempotente de solo inserción; verificar en PostgreSQL una base limpia, una segunda ejecución y la preservación de valor y estado editados por un administrador.

## 3. Integración con el análisis persistido

- [x] 3.1 Verificar con pruebas de integración PostgreSQL que noticias `es` y `en` persistan valor de humor, ocurrencias y aportes ligados al término canónico correcto, sin alterar la fórmula ni recalcular noticias ya analizadas.
- [ ] 3.2 Ejecutar la suite backend pertinente y `openspec validate --change e2-h03-bilingual-sentiment --strict`; confirmar que los escenarios bilingües pasan y que no se requieren cambios de esquema, endpoint ni documentación OpenAPI.
