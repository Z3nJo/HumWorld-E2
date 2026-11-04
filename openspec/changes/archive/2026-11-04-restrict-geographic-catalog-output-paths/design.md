## Context

Véase `proposal.md` para la motivación. El generador recibe dos destinos obligatorios y llama a `write_json` dos veces; esta función crea padres y escribe sin comprobar el ámbito. Las fuentes de entrada se leen por otras funciones y sus incidencias se abordarán después. El comando documentado se ejecuta desde `backend/` con destinos `data/geography/catalog.json` y `data/geography/manifest.json`. Las pruebas actuales escriben en `tmp_path`.

El usuario eligió permitir salidas solamente dentro de `backend/data/geography`, sin un directorio configurable por CLI. Este diseño resuelve el cambio de compatibilidad y los límites de la validación de rutas.

## Goals / Non-Goals

**Goals:** limitar las escrituras del generador, rechazar rutas externas sin efectos secundarios y mantener el formato determinista y el uso habitual.

**Non-Goals:** restringir entradas de lectura, cambiar el seed/runtime, introducir endpoints, modificar los datos versionados o dar por solucionadas otras incidencias de Sonar. Tampoco se declara un sandbox frente a un proceso local hostil con permiso para modificar simultáneamente el árbol de directorios del backend.

## Decisions

### 1. Raíz fija respecto del backend instalado

Derivar el ámbito autorizado de la ubicación del módulo: `<backend>/data/geography`. En Docker será `/app/data/geography`; no usar la ruta de Windows del desarrollador. No introducir `--output-root`, variables de entorno ni inferir la raíz de los destinos solicitados, porque permitirían ampliar la autorización desde los mismos argumentos que se validan.

Las rutas relativas conservarán la interpretación respecto del directorio de trabajo, para que el comando existente no cambie. También se admiten rutas absolutas cuyo destino resuelto esté dentro del ámbito. No aceptar el propio directorio como archivo. Validar que la raíz y sus componentes no redirijan la escritura fuera de la ubicación geográfica prevista mediante enlaces o junctions; resolver la raíz sin comprobar su ubicación física podría legitimar accidentalmente una redirección.

### 2. Validación previa de ambos destinos y defensa en la función de escritura

Una función central de validación resolverá cada destino, incluyendo componentes existentes y padres todavía inexistentes, y comprobará pertenencia estructural mediante `relative_to`/`is_relative_to`. No usar comparación de prefijos de texto, que aceptaría un directorio hermano como `geography-extra`. Resolver también enlaces simbólicos existentes, incluidos enlaces del archivo final; rechazar escapes, bucles de enlaces, raíces distintas en Windows, directorios como destino y rutas que no puedan validarse.

El CLI validará catálogo y manifiesto antes de generar efectos de salida y rechazará que ambos resuelvan al mismo archivo. Una segunda ruta inválida no debe dejar el primer JSON modificado ni crear carpetas para él. `write_json` validará también cuando se invoque directamente: no basta con proteger exclusivamente el parser. Se mantendrá `CatalogGenerationError` como error de dominio y el CLI emitirá un diagnóstico legible con salida no cero.

Se aceptan rutas con `..` solo si, tras resolverlas, permanecen dentro del ámbito; el criterio es el destino efectivo. Los enlaces internos que resuelvan a un archivo interno pueden aceptarse, sin prometer preservar el enlace como parte del contrato. No se crearán directorios hasta que la validación conjunta termine correctamente.

### 3. Publicación segura por archivo

Tras validar, crear los padres necesarios dentro del ámbito y escribir el JSON en un archivo temporal seguro dentro del directorio autorizado, conservando UTF-8, claves ordenadas, indentación de dos espacios y salto LF final. Publicar mediante reemplazo del destino y limpiar el temporal ante fallos. Esto evita truncar el archivo final durante una escritura fallida y evita modificar un inode externo mediante un hard link preexistente.

Validar el destino efectivo de nuevo antes de publicar. El directorio de salida pertenece al operador y debe estar protegido frente a escrituras concurrentes no confiables. Esta combinación reduce riesgos, pero no demuestra inmunidad ante carreras de sustitución de directorios por otro proceso privilegiado. Los dos archivos no forman una transacción conjunta: el requisito de ausencia de cambios cubre rechazo de rutas inválidas, no una falla de disco posterior a publicar el primero.

### 4. Pruebas aisladas sin opción de escape en producción

Adaptar los tests con `monkeypatch` de la constante/raíz interna a un subdirectorio de `tmp_path`, manteniendo hermanos externos como objetivos de comprobación. No añadir un argumento público a `write_json` ni una opción CLI que permita eludir la raíz fija solo para facilitar pruebas. Los tests de CLI usarán esa raíz aislada por invocación del punto de entrada dentro del proceso de prueba.

Cubrir rutas relativas y absolutas válidas, subdirectorios nuevos, escape con `..`, ruta absoluta externa, hermano con prefijo común, enlace de archivo y padre hacia fuera, raíz redirigida, destinos iguales y rechazo del segundo destino antes de modificar el primero. Verificar bytes/contenido externo y ausencia de directorios nuevos, no solo que se lanzó una excepción. Los escenarios de enlaces se ejecutarán en Linux/CI y en Windows cuando los permisos lo permitan; cualquier skip local debe registrarse y no sustituye su ejecución en CI.

## Risks / Trade-offs

- [Exportaciones previas a otros directorios dejarán de funcionar] → Documentar el cambio; generar dentro del ámbito y copiar después mediante una acción explícita del operador.
- [Una validación aislada puede conservar la alerta de Sonar] → Mantener trazable el flujo validado hacia la escritura y comprobar la incidencia específica en un nuevo análisis, sin exclusiones ni cambios de severidad.
- [El root de pruebas puede confundirse con una configuración productiva] → Inyección únicamente desde monkeypatch de tests; raíz fija en producción.
- [Symlinks/junctions o errores de filesystem] → Fallar antes de escribir cuando no se pueda establecer el ámbito, cubrir rutas reales y rechazos en CI.
- [Carreras concurrentes fuera del modelo de CLI local] → Exigir un árbol de salida controlado por el operador; no presentar la validación como aislamiento de procesos.

## Migration Plan

1. Implementar la validación y adaptar pruebas aisladas sin tocar los artefactos geográficos versionados.
2. Actualizar la documentación con el ámbito fijo, rutas permitidas y errores esperados.
3. Ejecutar pruebas unitarias/CLI y verificar equivalencia byte a byte con las mismas entradas; no se requiere regenerar ni cambiar de versión el catálogo productivo.
4. Revisar CI y el nuevo análisis Sonar de la incidencia de escritura; las incidencias de lectura permanecen en el alcance del punto 4 posterior.
5. Si algún uso legítimo falla, generar en una ruta interna y copiar el resultado explícitamente. No reintroducir salidas arbitrarias como rollback silencioso.
