## Context

Ver `proposal.md` para la motivación. El generador usa `argparse` con `type=Path`, que convierte argumentos pero no autoriza ubicaciones. `read_json`, `open_text_source` y `checksum` abren directamente las rutas recibidas. El seed hace lo mismo en `load_catalog` y permite `--catalog`; Docker lo ejecuta sin ese argumento y utiliza `data/geography/catalog.json` del backend instalado.

Las salidas del generador ya están restringidas mediante una corrección independiente. Las entradas actuales admiten rutas externas y las pruebas usan directorios temporales; ambos usos deben adaptarse al contrato elegido por el usuario.

## Goals / Non-Goals

**Goals:** Definir un límite de lectura común, comprobarlo tanto en los puntos de entrada como antes de las aperturas y conservar los resultados de entradas autorizadas.

**Non-Goals:** Cambiar algoritmos, formatos de fuentes, esquema de base de datos o permisos generales del sistema; descargar datasets; añadir opciones para ampliar raíces; impedir ataques de un actor con capacidad de modificar concurrentemente el árbol autorizado. No se cambia la política de salidas ni se asume una vulnerabilidad HTTP demostrada.

## Decisions

### 1. Raíces fijas y funciones de cada entrada

Anclar las ubicaciones al backend instalado, derivado de la ubicación del módulo, sin depender del directorio de trabajo ni aceptar raíces desde argumentos o variables de entorno:

| Entrada | Ámbito autorizado |
| --- | --- |
| REST Countries, ciudades GeoNames y nombres alternativos | `data/geography/sources` y sus subdirectorios |
| Curación del generador | `data/geography` y sus subdirectorios |
| Catálogo del seed | `data/geography` y sus subdirectorios |

En Docker corresponden a `/app/data/geography/...`. Las rutas relativas mantienen la semántica actual respecto al directorio de trabajo; desde `backend/` se documentará `data/geography/sources/...`. También se aceptan rutas absolutas internas. La ausencia del argumento opcional de nombres alternativos no requiere ese archivo. El seed predeterminado no necesita que exista el directorio de fuentes.

Se descartó autorizar directorios externos mediante configuración: el usuario eligió raíces fijas. Añadir una raíz CLI controlada por la misma entrada que se pretende restringir tampoco constituiría un límite adecuado.

### 2. Validador compartido y resultado utilizado para abrir

Ubicar la política en un módulo pequeño compartido del backend, sin dependencias de la base de datos. Resolver la ruta con existencia requerida, resolver sus enlaces y comprobar pertenencia por componentes, no mediante prefijos de texto. Verificar que es un archivo regular y que las raíces resueltas coinciden con las ubicaciones esperadas; una raíz o un ancestro redirigido fuera no debe convertir su destino en una autorización nueva.

Los lectores abrirán la ruta devuelta por el validador, no el argumento original. La normalización por sí sola, filtrar `..` o comprobar extensiones no sustituye la autorización. Los enlaces internos que resuelvan a archivos dentro del ámbito pueden aceptarse; los enlaces externos se rechazan. Se rechazan archivos inexistentes, directorios, dispositivos y otros archivos especiales antes de leerlos.

El árbol autorizado debe estar bajo control del operador. La pertenencia por ruta no identifica la procedencia de un inode compartido mediante hard links ni bloquea intercambios concurrentes entre comprobación y apertura; no se promete aislamiento frente a esos actores. Tampoco verifica la autenticidad o inocuidad del contenido de un dataset autorizado.

### 3. Protección del flujo completo y de las llamadas directas

`generate` validará conjuntamente las entradas con su ámbito por función antes de leer la primera, incluido el archivo opcional cuando se informe. El CLI seguirá validando las salidas antes de generar. Una entrada inválida no publicará catálogo ni manifiesto.

Las operaciones de bajo nivel `read_json`, `open_text_source` y `checksum` también validarán sus rutas antes de abrir. Para usos genéricos directos, su ámbito máximo será `data/geography`; los puntos que consumen REST Countries y GeoNames aplicarán adicionalmente el ámbito más estrecho `sources`, incluso en llamadas directas a la generación. Si se incorporan parámetros internos para distinguir el tipo de entrada, serán valores cerrados de la política, nunca raíces arbitrarias suministradas por el usuario.

`load_catalog` validará el ámbito del seed en toda invocación. El CLI cargará y validará el archivo antes de abrir la sesión de base de datos y ejecutar `seed_geography`; conservará las validaciones del contenido y la idempotencia existentes. Convertir errores de rutas en diagnósticos de dominio y salida no cero de los comandos, sin volcar contenido leído ni secretos.

El ZIP se abrirá únicamente después de validar el archivo externo. Se conservará su lectura en memoria, sin extracción al disco y con la selección existente de un único miembro. No se incorpora un subsistema nuevo de extracción.

### 4. Preparación de fuentes y compatibilidad

Actualizar el comando documentado para usar `data/geography/sources/rest-countries.json`, `cities15000.txt` y `alternateNamesV2.zip`; mantener la curación y salidas habituales. El operador copiará explícitamente las fuentes externas a esa carpeta antes de generar. Preparar una explicación del directorio y exclusiones precisas para no versionar ni incorporar por defecto datasets descargados a la imagen backend. No excluir `catalog.json`, `manifest.json` ni la curación versionada.

Los datos generados y los aliases de fixtures válidos deben seguir siendo idénticos. Las pruebas crearán un backend temporal con la estructura de raíces autorizadas y sustituirán exclusivamente el anclaje interno durante el test, sin añadir una opción productiva para desactivar validaciones. Cubrir las rutas de cada ámbito y los cuatro puntos de apertura, además del orden de validación previo a lecturas y efectos.

## Risks / Trade-offs

- Los comandos que apuntaban fuera del proyecto dejarán de funcionar → documentar el traslado explícito de las fuentes y mostrar ejemplos internos.
- Un ámbito demasiado amplio podría autorizar datasets fuera de `sources` → comprobar la función de cada entrada antes de leer y probar invocaciones directas del generador.
- Symlinks y junctions tienen soporte diferente en Windows y Linux → ejecutar pruebas de enlaces en el sistema que los permita y registrar cualquier limitación; no considerar una prueba omitida como comprobación superada.
- Sonar podría no reconocer un validador personalizado → revisar los cuatro flujos sobre la revisión publicada y ajustar la protección comprobable si es necesario, sin silenciar reglas ni dar por cerrado el hallazgo solo por pruebas locales.
- Verificar el seed contra la base habitual podría actualizar datos → usar PostgreSQL desechable para la idempotencia y el arranque integrado; sobre la aplicación habitual usar únicamente consultas de lectura.

## Migration Plan

1. Preparar `data/geography/sources` y copiar allí únicamente las fuentes previstas. Conservar el catálogo y curación versionados en su ubicación actual.
2. Aplicar política, lectores y diagnósticos; adaptar fixtures y documentación. No regenerar ni cambiar el catálogo productivo como efecto de esta corrección.
3. Ejecutar regresiones, generación controlada y seed en PostgreSQL desechable. Verificar arranque y consultas del dashboard en Docker aislado.
4. Al publicar una PR autorizada, comprobar CI y los cuatro hallazgos en Sonar con su revisión exacta.

No requiere migración del esquema ni reclasificación de noticias. Ante un rechazo de una fuente legítima, corregir su preparación o ubicación; no ampliar silenciosamente el ámbito ni restaurar lecturas arbitrarias.
