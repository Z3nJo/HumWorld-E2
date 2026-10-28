## Why

El catálogo geográfico reconoce actualmente gentilicios explícitos para solo siete países, por lo que muchas noticias que mencionan una nacionalidad no pueden atribuirse por esa evidencia. La infraestructura existente ya admite ampliar estos aliases de forma versionada, sin modificar el clasificador ni sus contratos.

## What Changes

- Ampliar la curación de gentilicios para cubrir los 195 Estados ampliamente reconocidos: los 193 miembros de Naciones Unidas, Palestina y Ciudad del Vaticano.
- Incorporar formas explícitas en español e inglés, incluyendo género y número cuando correspondan, y conservar una única forma ortográfica canónica cuando la normalización ya cubra mayúsculas y tildes.
- Conservar en la curación las formas estándar compartidas por más de un país, pero permitir que el generador las excluya del catálogo ejecutable cuando no puedan resolverse inequívocamente, sin añadir overrides ni frases artificiales.
- Incrementar la versión del catálogo geográfico y regenerar sus artefactos deterministas, conteos y checksums.
- Verificar que los nuevos aliases inequívocos se resuelvan al código ISO-2 correcto y sean reconocidos por el matcher vigente, y que las coincidencias inherentemente ambiguas no produzcan atribuciones.
- Mantener fuera de alcance los territorios dependientes restantes, expresiones coloquiales, cambios de algoritmo, esquema, API, captura, dashboard, frontend, ciudades y nombres de países.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. El contrato de `news-geographic-attribution` ya establece un catálogo versionado con gentilicios explícitos y actualizaciones reproducibles; este cambio amplía el contenido curado dentro de ese comportamiento.

## Impact

- **Datos:** `backend/data/geography/geography-curation.v1.json`, `catalog.json` y `manifest.json`.
- **Pruebas:** cobertura representativa de gentilicios en ambos idiomas y validación del catálogo regenerado.
- **Operación:** ejecutar el seed idempotente para cargar la nueva versión y, cuando se requiera actualizar noticias históricas, ejecutar el backfill existente.
- **Compatibilidad:** no cambia rutas, esquemas de respuesta, modelos persistidos ni comportamiento del frontend. La nueva versión puede producir atribuciones adicionales únicamente cuando una noticia contenga uno de los gentilicios incorporados.
