## Why

SonarQube identifica una incidencia High de Path Traversal en `generate_geographic_catalog.write_json()`: los argumentos CLI pueden dirigir la escritura y la creación de directorios fuera del catálogo. El generador debe limitar sus salidas al directorio de datos geográficos para evitar sobrescrituras accidentales por argumentos incorrectos.

## What Changes

- **BREAKING**: permitir las salidas del catálogo y del manifiesto únicamente dentro de `backend/data/geography`, incluyendo sus subdirectorios; rechazar destinos externos que antes se aceptaban.
- Fijar ese ámbito respecto de la ubicación instalada del backend, sin opciones CLI ni variables de entorno que lo amplíen. En la imagen Docker corresponde a `/app/data/geography`.
- Validar ambos destinos antes de crear directorios o escribir: resolver rutas y enlaces existentes, rechazar escapes y destinos coincidentes, y comunicar el error con código de salida distinto de cero.
- Conservar las opciones CLI existentes, el comando documentado y la serialización determinista de los JSON.
- Añadir pruebas que demuestren que los destinos externos permanecen intactos y que los destinos válidos siguen funcionando, con fixtures aisladas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `news-geographic-attribution`: añadir el requisito de publicación del catálogo y manifiesto dentro del directorio geográfico autorizado, con rechazo sin escrituras ante rutas inválidas.

## Impact

- `backend/scripts/generate_geographic_catalog.py`, pruebas de generación/rutas y `backend/data/geography/README.md`.
- Delta OpenSpec aditivo: no modifica las reglas de reconocimiento, el catálogo generado ni los contratos HTTP.
- Se limita al punto 1 de la revisión: la escritura. Las incidencias de lectura en `checksum`, `read_json`, `open_text_source` y `load_catalog`, el Dockerfile frontend y los SHA de Actions se tratarán por separado.
- El archivado anterior de credenciales y sus cambios locales se preservan. No implica marcar SNQ-04 completa hasta verificar las restantes incidencias.
