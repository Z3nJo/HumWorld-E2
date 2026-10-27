## 1. Contratos y línea base

- [x] 1.1 Sincronizar y archivar `t-dash-01-dashboard-aggregates`, incorporar sus contratos faltantes de `geografia`, `evolucion` y `noticias-influyentes` si corresponde, y verificar que `openspec list --specs` exponga una capacidad de dashboard coherente antes de modificar su semántica.
- [x] 1.2 Registrar pruebas de caracterización para captura, sentimiento, administración de canales y los cinco endpoints de dashboard, y verificar que la suite actual pase sin cambios funcionales antes de iniciar la migración.

## 2. Esquema y catálogo geográfico

- [x] 2.1 Crear modelos y migración Alembic para `pais`, `pais_alias`, `noticia_pais`, fecha/versión geográfica de noticia, restricciones e índices; verificar upgrade/downgrade y metadatos contra PostgreSQL.
- [x] 2.2 Implementar el generador determinista desde versiones identificadas de REST Countries y GeoNames, incluyendo todos los países y territorios con ISO-2 oficial, rechazando códigos no oficiales salvo override curado, asignando un continente canónico y filtrando ciudades por población `>= 100000` o capitalidad; verificar checksums, orden estable, ausencia de códigos ISO como aliases y fallo ante colisiones o geografías no resueltas.
- [x] 2.3 Crear el overlay versionado de gentilicios, palabras excluidas, inclusiones no oficiales, aliases ambiguos y overrides continentales; generar el JSON y manifiesto con licencias, procedencia, umbral, capitales y conteos, y verificar que dos ejecuciones con las mismas entradas produzcan archivos idénticos sin depender de ediciones directas en PostgreSQL.
- [x] 2.4 Implementar el seed idempotente de países y aliases con desactivación de aliases retirados y detección de conflictos; verificar sobre PostgreSQL una carga limpia, una repetición y una actualización de versión sin duplicados.
- [x] 2.5 Crear un diagnóstico de canales existentes con país ausente del catálogo o continente incoherente; verificar que informe los registros incompatibles sin modificarlos.

## 3. Reconocimiento y atribución

- [x] 3.1 Extraer la normalización/tokenización común sin alterar las reglas de sentimiento y verificar que toda la suite de `sentiment_engine` conserve sus resultados.
- [x] 3.2 Implementar el matcher geográfico por idioma basado en trie, aliases explícitos y coincidencia más larga; verificar con pruebas unitarias mayúsculas, tildes, límites de palabra, frases solapadas, gentilicios, ciudades y exclusión de aliases ambiguos.
- [x] 3.3 Implementar el servicio puro de atribución con prioridad título→descripción→fuente, deduplicación por país, evidencia determinista y resultado clasificado sin país; verificar casos de un país, múltiples países, ciudad+país, fuente de respaldo, canal sin país y catálogo inválido.
- [x] 3.4 Medir compilación y clasificación del matcher con el catálogo completo sobre un lote representativo y registrar el resultado; verificar que no se introduzca una dependencia nueva ni un recorrido lineal de todos los aliases por cada posición del texto.

## 4. Persistencia, captura y backfill

- [x] 4.1 Extender el repositorio de captura para cargar candidatos geográficos, reemplazar asociaciones por noticia y reclamar clasificaciones nulas o desactualizadas independientemente de `fecha_analisis`; verificar concurrencia con `SKIP LOCKED`, claves compuestas y reemplazo atómico en PostgreSQL.
- [x] 4.2 Integrar sentimiento y atribución de noticias nuevas en la transacción vigente por fuente; verificar que un fallo geográfico revierta noticia, términos, países y `fecha_ultima_captura` sin impedir procesar otras fuentes.
- [x] 4.3 Incorporar el procesamiento geográfico pendiente sin recalcular noticias cuyo sentimiento ya está analizado; verificar que `valor_humor`, `fecha_analisis` y `NOTICIA_TERMINO` permanezcan intactos.
- [x] 4.4 Implementar el comando de backfill por lotes, reanudable y parametrizado por versión; verificar primera clasificación, repetición idempotente, actualización de versión y reanudación después de un lote fallido.

## 5. Canales y respaldo histórico

- [x] 5.1 Validar en altas y actualizaciones que el país exista en el catálogo local y pertenezca al continente declarado, conservando normalización y país nulo; verificar respuestas `400`, atomicidad y OpenAPI mediante pruebas de servicio y HTTP.
- [x] 5.2 Reconciliar en la misma transacción las asociaciones históricas con origen `fuente` cuando cambie país o continente del canal; verificar cambio de país, limpieza a nulo, asignación desde nulo, rollback y preservación de todas las asociaciones `mencion`.
- [x] 5.3 Extender las pruebas de fuentes/canales sobre PostgreSQL para confirmar que los datos históricos quedan disponibles tras reinicio y que la validación no realiza solicitudes externas.

## 6. Consultas geográficas del dashboard

- [x] 6.1 Implementar una relación reutilizable de pertenencia por país, continente distinto y respaldo continental sin país; verificar con fixtures multinacionales que produzca una sola fila por `(noticia, ámbito)`.
- [x] 6.2 Migrar agregados generales y `/geografia` a `noticia_pais`, contando cada noticia una vez por país y una vez por continente; verificar promedios, conteos, suficiencia, países de continentes distintos y noticias clasificadas sin país.
- [x] 6.3 Migrar evolución diaria y nube de palabras usando `EXISTS` o identificadores distintos; verificar que una noticia con varios países del ámbito no duplique humor, frecuencia ni aportes de términos.
- [x] 6.4 Migrar noticias influyentes para filtrar por atribución sin duplicar resultados ni alterar su deduplicación por URL, manteniendo `canal`, `continente` y `pais` de la fuente en la respuesta; verificar filtros por país mencionado y compatibilidad exacta del esquema HTTP.
- [x] 6.5 Comparar planes y tiempos de las consultas geográficas con un conjunto representativo y verificar el uso de índices; documentar cualquier regresión antes de considerar materialización u otra optimización fuera de alcance.

## 7. Verificación y documentación

- [x] 7.1 Añadir una prueba vertical PostgreSQL que ejecute migración, seed, captura controlada, atribución por mención y fuente, backfill, corrección de canal y consultas de dashboard sin acceso a Internet; verificar todos los conteos y procedencias persistidas.
- [x] 7.2 Actualizar pruebas de OpenAPI para confirmar que las formas de respuesta y rutas del dashboard/captura no cambian y que la validación nueva de canales está publicada; verificar que no se agreguen endpoints o campos destinados al frontend.
- [x] 7.3 Actualizar ADR-001, ADR-002, MOD-01, documentación de componentes, README operativo y atribuciones de datos para reemplazar la navegación geográfica exclusiva por canal y explicar catálogo, precedencia, multiplicidad, backfill y limitaciones del frontend.
- [x] 7.4 Ejecutar las suites unitarias, integración PostgreSQL, frontend sin modificaciones, linters y `openspec validate attribute-news-to-mentioned-countries --strict`; verificar que el diff final no incluya archivos bajo `frontend/src` y conservar evidencia de resultados.
- [x] 7.5 Empaquetar el catálogo y los comandos geográficos en la imagen backend, ejecutar el seed local idempotente antes de iniciar la API y verificar que seed y backfill estén disponibles dentro del contenedor sin modificar el frontend.
