## 1. Validación del ámbito de salida

- [x] 1.1 Incorporar la raíz fija `<backend>/data/geography` relativa al módulo instalado y una validación central de destinos efectivos; rechazar escapes, raíces redirigidas, directorios como archivo y rutas no resolubles sin crear carpetas.
- [x] 1.2 Proteger la invocación directa de `write_json` con esa validación, sin incorporar un parámetro público ni opción CLI/env que amplíe la raíz; adaptar los tests existentes mediante una raíz interna aislada con monkeypatch.
- [x] 1.3 Validar conjuntamente `--catalog-output` y `--manifest-output` antes de efectos de salida y rechazar destinos coincidentes; transformar el rechazo en error CLI legible y código no cero.

## 2. Escritura y compatibilidad

- [x] 2.1 Implementar publicación por archivo con un temporal seguro dentro del directorio permitido, reemplazo final y limpieza ante errores; mantener UTF-8, claves ordenadas, indentación y LF final, sin modificar un inode externo por hard links.
- [x] 2.2 Probar rutas relativas documentadas, rutas absolutas internas y subdirectorios nuevos; comprobar equivalencia byte a byte con la serialización previa para las mismas entradas.
- [x] 2.3 Cubrir rutas externas absolutas, escapes con `..`, hermano con prefijo común, directorio como destino e invocación directa; verificar contenido externo intacto y ausencia de padres creados al rechazar.
- [x] 2.4 Cubrir enlaces de archivo/padre hacia fuera, raíz redirigida y hard links; ejecutar los escenarios de enlaces en Linux/CI y registrar los skips que dependan de permisos locales Windows.
- [x] 2.5 Añadir casos CLI de primer destino válido y segundo inválido y de destinos coincidentes; demostrar que se preservan el catálogo y manifiesto previos y que no quedan carpetas o temporales nuevos por el rechazo de rutas.

## 3. Documentación y verificación de seguridad

- [x] 3.1 Actualizar `backend/data/geography/README.md` con el ámbito fijo, la compatibilidad del comando existente y ejemplos de rechazos; explicar que exportar fuera requiere una copia explícita posterior del operador.
- [x] 3.2 Ejecutar las pruebas del generador y la suite backend pertinente, comprobar que no cambiaron los datos geográficos versionados y validar el change con `openspec validate restrict-geographic-catalog-output-paths --strict`.
- [ ] 3.3 Publicar la corrección en su PR y verificar CI y Sonar sobre el SHA corregido; registrar el estado específico de Path Traversal en `write_json`, sin ocultar incidencias ni declarar resueltas las de lectura u otras categorías.
