## 1. Curación de gentilicios

- [x] 1.1 Ampliar `demonyms` en `geography-curation.v1.json` para que los códigos ISO-2 de los 193 miembros de Naciones Unidas, Palestina (`PS`) y Ciudad del Vaticano (`VA`) tengan al menos una forma canónica en español y otra en inglés dentro de la curación; verificar mediante una comprobación automatizada que existan exactamente 195 códigos objetivo y que los siete países ya cubiertos conserven sus aliases.
- [x] 1.2 Incorporar explícitamente género y número cuando la forma los distinga, usar una sola entrada cuando la normalización ya cubra mayúsculas o tildes y omitir expresiones coloquiales o regionalmente ambiguas; verificar que no haya aliases vacíos ni duplicados normalizados dentro de un idioma y país.
- [x] 1.3 Revisar las formas que colisionen con aliases de otros países o ciudades y conservar su exclusión automática cuando no puedan resolverse inequívocamente; verificar que el generador termine sin errores, que no se añadan overrides y que ninguna forma ambigua aparezca en el catálogo ejecutable.

## 2. Versionado y regeneración

- [x] 2.1 Incrementar `catalog_version` a una versión posterior a `2026-10-27.v1` sin cambiar las versiones de REST Countries o GeoNames; verificar antes de generar que las entradas geográficas usadas coincidan con los checksums registrados en el manifiesto vigente.
- [x] 2.2 Regenerar `catalog.json` y `manifest.json` con el generador existente; verificar determinismo mediante dos ejecuciones idénticas y confirmar que el diff funcional solo modifique la versión, el checksum de la curación, los conteos derivados y aliases de tipo `gentilicio`.
- [x] 2.3 Comprobar que los 249 países y territorios, el umbral de población, las capitales, las ciudades y los aliases de tipo `pais` permanezcan sin cambios respecto del catálogo anterior.

## 3. Verificación

- [x] 3.1 Añadir pruebas de integridad del conjunto curado para validar cobertura bilingüe de los 195 códigos objetivo, pertenencia al catálogo ISO-2, ausencia de duplicados normalizados por país y exclusión de coincidencias ambiguas del catálogo ejecutable; verificar que las pruebas fallen si falta un idioma, se introduce un código ajeno al alcance o sobrevive una ambigüedad.
- [x] 3.2 Añadir casos representativos del matcher para gentilicios masculinos, femeninos, plurales, invariantes y en inglés; verificar que cada caso resuelva el código de país correcto respetando límites de palabra, mayúsculas y tildes.
- [x] 3.3 Ejecutar las pruebas del generador, matcher, seed y atribución geográfica, y después la suite completa del backend; verificar que no se modifiquen esquema, migraciones, API, captura, dashboard ni archivos bajo `frontend/src`.
- [x] 3.4 Cargar el catálogo regenerado con el seed idempotente en PostgreSQL y repetir la carga; verificar que la primera ejecución incorpore la nueva versión, la segunda no duplique aliases y el backfill existente pueda seleccionar noticias con una versión geográfica anterior sin recalcular sentimiento.
