# Evidencia de implementación — 30 de octubre de 2026

Rama: `fix/restrict-geographic-catalog-output-paths`.

## Alcance

Se restringen las salidas del generador a `data/geography` del backend instalado,
sin argumento CLI/env que amplíe esa raíz. Se validan ambas salidas antes de generar
efectos, incluida la coincidencia por hard links y los conflictos padre/hijo. La
operación de escritura directa también valida la ruta y publica mediante temporal
seguro y reemplazo, manteniendo el formato de serialización.

El modelo presupone directorios controlados por el operador; no es un sandbox frente
a un proceso privilegiado que sustituye directorios concurrentemente. Las lecturas
del generador y del seed no se modifican en este change.

## Verificación local

- Primera ejecución focalizada en Docker/Linux: 23 pruebas correctas de generación y
  rutas; posteriormente se añadieron dos casos de conflicto padre/hijo.
- Suite backend sin integración PostgreSQL en Docker: **247 passed, 65 deselected**,
  una advertencia de deprecación de Starlette/httpx. Incluye todos los casos de rutas
  y generación; no hubo skips de symlinks en Linux.
- Se verifican rutas relativas/absolutas internas, subdirectorios nuevos, contenido
  determinista byte a byte, escapes con `..`, rutas externas y prefijos comunes,
  enlaces de archivo/padre, raíz y directorio `data` redirigidos, preservación de
  inode externo por hard link, limpieza ante fallo de reemplazo y prevalidación CLI.
- `git diff --quiet` confirma que `catalog.json`, `manifest.json` y
  `geography-curation.v1.json` no cambian. Solo se modifica el README de ese directorio.
- Validación estricta de OpenSpec y revisión de whitespace: correctas.
- Suite completa backend en Docker con PostgreSQL 16 desechable: **312 passed**,
  11 advertencias de deprecación, 25,93 segundos de pytest. Migraciones y comprobación
  de contratos sincronizados correctas. Se ejecutó con el harness aislado existente:
  `RUN_POSTGRES_ROTATION_TEST=1`, `RUN_INTEGRATED_CREDENTIAL_TESTS=1` y
  `python -m unittest discover -s opsx/tests -p test_postgresql_rotation.py -v`.
  El contenedor/volumen de prueba fueron eliminados; no se usó la base real.

## Verificación remota

Pendiente de publicar y comprobar el SHA de la PR en CI y Sonar. El cierre específico
de Path Traversal en `write_json` debe verificarse sobre el análisis corregido; no se
declara solucionado por una comprobación local ni se dan por resueltas otras issues.

El archivado previo de credenciales permanece como cambio local separado y no debe
incorporarse accidentalmente a la PR de esta corrección.
