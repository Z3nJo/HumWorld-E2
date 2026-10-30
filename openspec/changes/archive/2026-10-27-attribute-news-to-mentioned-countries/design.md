## Context

Véase `proposal.md` para la motivación. Actualmente `NOTICIA` conserva el humor y los términos reconocidos, pero su pertenencia geográfica se resuelve dinámicamente mediante `NOTICIA → FUENTE_RSS → CANAL`. Todas las consultas de dashboard repiten esa navegación y asumen que una noticia pertenece a un solo país y continente.

El cambio cruza modelo, captura, administración de canales, consultas agregadas, seeds y documentación. Debe preservar el cálculo de sentimiento, la atomicidad por fuente y las formas de respuesta actuales. El frontend queda fuera de alcance, aun cuando su catálogo reducido no represente todos los países que podrá devolver el backend.

`t-dash-01-dashboard-aggregates` sigue activo aunque sus tareas estén completas y todavía declara la geografía por canal. Debe sincronizarse y archivarse antes de integrar esta propuesta para que el contrato base de dashboard pueda evolucionar sin mantener dos definiciones contradictorias.

## Goals / Non-Goals

**Goals:**

- Separar la procedencia editorial de la pertenencia geográfica atribuida.
- Mantener una clasificación determinista, auditable, reproducible y sin red en runtime.
- Admitir múltiples países por noticia sin duplicar una noticia dentro del mismo ámbito continental o global.
- Permitir backfill y reclasificación por versión sin acoplarlos a `fecha_analisis`.
- Conservar la atomicidad y aislamiento por fuente de la captura existente.
- Preservar rutas, parámetros y esquemas de respuesta del dashboard.

**Non-Goals:**

- Modificar el frontend, sus catálogos, el mapa o la presentación de noticias sin país.
- Agregar agregación, filtros o endpoints por ciudad.
- Descargar o analizar el cuerpo remoto de los artículos.
- Incorporar NER, modelos de lenguaje, geocodificación remota o desambiguación contextual.
- Inferir relevancia temática, negaciones o relaciones semánticas entre las entidades mencionadas.
- Recalcular sentimiento al actualizar el catálogo geográfico.

## Decisions

### Modelo normalizado para país, alias y atribución

Se incorporarán las siguientes estructuras:

```text
PAIS
  codigo_iso2 PK
  nombre_es
  nombre_en
  continente

PAIS_ALIAS
  id_alias PK
  alias
  alias_normalizado
  tipo                 pais | gentilicio | ciudad
  idioma               es | en
  codigo_pais FK
  activo
  version_catalogo

NOTICIA_PAIS
  id_noticia PK/FK
  codigo_pais PK/FK
  origen               mencion | fuente
  id_alias FK nullable
  campo                 titulo | descripcion | null

NOTICIA
  fecha_clasificacion_geografica nullable
  version_clasificador_geografico nullable
```

`PAIS` será la única fuente de verdad para `codigo_iso2 → continente`; `continente` no se repetirá en cada alias. La clave compuesta de `NOTICIA_PAIS` impide duplicar un país aunque el texto contenga varias evidencias. Las restricciones comprobarán que una mención tenga alias y campo, mientras que un respaldo por fuente no los tenga.

Los aliases que desaparezcan de una versión se desactivarán en vez de eliminarse inmediatamente, para no romper evidencia histórica antes del backfill. La clasificación solo utilizará aliases activos. Se descarta guardar país y continente directamente en `NOTICIA` porque no representa cardinalidad múltiple y repetiría datos canónicos.

Una noticia procesada sin país tendrá fecha y versión geográfica, pero cero filas en `NOTICIA_PAIS`. Esa combinación distingue un resultado vacío válido de una noticia pendiente.

### Catálogo generado fuera del runtime

Un script de desarrollo descargará versiones identificadas de REST Countries y GeoNames, verificará checksum cuando la fuente lo permita y producirá JSON ordenado de forma estable. REST Countries aportará países, territorios, traducciones, regiones y capitales; GeoNames aportará ciudades y nombres alternativos en `es` y `en`.

El inventario canónico incluirá todos los países y territorios con código ISO-2 oficial. Los códigos sin reconocimiento ISO-2 oficial se excluirán por defecto y solo podrán incorporarse mediante un override explícito en el archivo curado. Cada código tendrá exactamente un continente del dominio de HumWorld; los casos transcontinentales o incompatibles con la región de origen se resolverán mediante overrides versionados, nunca mediante decisiones implícitas en el seed.

Para ciudades, GeoNames se filtrará por población igual o superior a 100.000 habitantes. Todas las capitales se incluirán aunque tengan una población inferior y se complementarán desde REST Countries para no depender de su presencia en `cities15000`. Los nombres alternativos se limitarán a `es` y `en` antes de aplicar las reglas de ambigüedad.

Un archivo curado versionado añadirá gentilicios, resolverá aliases aprobados y excluirá palabras comunes o casos geopolíticos/lingüísticos problemáticos. El generador:

- normalizará Unicode, mayúsculas, tildes y espacios para detectar colisiones;
- exigirá un código ISO-2 oficial o una inclusión manual explícita y asignará exactamente un continente canónico;
- no añadirá códigos ISO como aliases;
- conservará únicamente ciudades con población igual o superior a 100.000 habitantes o que sean capitales;
- descartará aliases que apunten a países distintos salvo override explícito;
- emitirá manifiesto con versión, fecha, fuentes, licencias y checksums;
- fallará ante colisiones no resueltas o códigos/continentes desconocidos.

El archivo curado será la única vía para gentilicios, inclusiones no oficiales, overrides continentales y resolución de aliases; no se considerarán fuente de verdad las ediciones manuales directas en PostgreSQL. El seed leerá únicamente el JSON generado del repositorio, hará upsert de países y aliases administrados por catálogo y desactivará aliases retirados. No sobrescribirá silenciosamente una colisión incompatible. Se descarta consultar las fuentes geográficas al arrancar la aplicación o en CI porque haría la clasificación no reproducible.

### Reconocedor geográfico especializado sobre tokenización común

Se extraerá del motor de sentimiento una normalización/tokenización reutilizable, pero la geografía tendrá su propio modelo de candidato y su propia política. Los aliases activos se agruparán por idioma y se compilarán en un trie de secuencias de tokens una vez por lote o versión. Esto evita el recorrido `aliases × palabras` y no incorpora una dependencia nueva.

La geografía no reutilizará las inflexiones automáticas de sentimiento. Todas las formas aceptadas —incluidos género y plural de gentilicios— estarán presentes explícitamente en el catálogo. Durante el reconocimiento:

1. se buscan coincidencias en el título;
2. solo si no se obtiene ningún país, se buscan en la descripción;
3. para solapamientos que comienzan en la misma posición, gana la secuencia más larga;
4. los resultados se deduplican por código de país;
5. si varias evidencias del mismo país sobreviven, se conserva como evidencia la de más tokens y luego el menor `id_alias` como desempate determinista.

Se descarta mezclar título y descripción porque aumenta menciones incidentales. También se descarta desambiguar ciudades homónimas por población o proximidad: los aliases ambiguos se excluyen y se podrán añadir frases inequívocas mediante curación.

### Precedencia de la fuente y resultado sin país

El respaldo del canal se aplica únicamente cuando título y descripción no producen países. Un respaldo válido genera una fila `NOTICIA_PAIS(origen=fuente)`. Si el canal no tiene país, la noticia queda clasificada sin filas y las consultas continentales usan el continente actual del canal.

Si existe cualquier país mencionado, la fuente no se agrega como país adicional. Esta regla impide que la procedencia editorial vuelva a contaminar el ámbito temático. Se conserva el enlace a fuente y canal para mostrar quién publicó y para el último respaldo continental.

Un catálogo vacío o sin una versión válida será un error de configuración. No se permitirá continuar aplicando respaldo a todas las noticias, porque ese comportamiento reproduciría silenciosamente el defecto que este cambio corrige.

### Integración transaccional y procesamiento independiente

La captura cargará aliases por idioma junto con los términos de sentimiento. Para cada noticia insertada calculará sentimiento y geografía en memoria, y persistirá ambos resultados dentro de la transacción existente por fuente. Cualquier fallo geográfico revertirá inserciones, sentimiento y fecha de última captura de esa fuente, manteniendo el aislamiento entre fuentes.

La selección de sentimiento pendiente continuará definida exclusivamente por `fecha_analisis IS NULL`. Se añadirá una selección geográfica separada para noticias cuya fecha sea nula o cuya versión difiera de la versión objetivo. El procesamiento podrá ejecutar únicamente el trabajo ausente; una noticia ya analizada no recalculará humor por necesitar geografía.

El backfill será un comando explícito, por lotes y reanudable. Cada lote reclamará filas con bloqueo que omita filas ya tomadas por otro proceso, reemplazará las asociaciones por noticia y confirmará su versión. Repetir la misma versión será un no-op funcional.

### Correcciones de canal con efecto retroactivo acotado

Las escrituras de canal validarán el país contra el catálogo local y comprobarán su continente. Al modificar país o continente, la misma transacción reconciliará únicamente las noticias del canal que no tengan atribuciones por mención:

- país válido nuevo: reemplazar o crear la asociación `fuente`;
- país nulo: retirar la asociación `fuente` y conservar pertenencia al continente del canal;
- cambio solo de continente con país nulo: no crear asociación, pues el continente se resuelve desde el canal;
- noticias con una o más asociaciones `mencion`: no modificarlas.

Esto preserva el efecto histórico de corregir un canal sin convertir los países mencionados en instantáneas dependientes de la fuente. Si la reconciliación falla, también se revierte el cambio del canal.

La migración no añadirá inicialmente una FK desde `CANAL.pais` a `PAIS`, porque el catálogo se carga después de Alembic y pueden existir códigos históricos que requieran diagnóstico. El servicio aplicará la validación a todas las escrituras nuevas; un chequeo previo al despliegue listará canales existentes no soportados. `NOTICIA_PAIS` sí tendrá FK a `PAIS` porque sus filas se crean después del seed.

### Conjunto de pertenencia para consultas de dashboard

Las consultas compartirán una relación lógica de pertenencia:

```text
país:       (noticia, país) desde NOTICIA_PAIS
continente: DISTINCT (noticia, continente del país)
             o continente del canal cuando la noticia clasificada no tiene país
global:     noticia sin join geográfico multiplicador
```

Los agregados por país podrán agrupar la asociación. Los filtros de evolución, términos y ranking usarán `EXISTS` o una subconsulta de identificadores distintos para que una noticia no se multiplique. El agregado continental deduplicará `(id_noticia, continente)`: una noticia de Chile y Argentina cuenta una vez en América; una de Chile y Ucrania cuenta una vez en América y una vez en Europa/Asia según el catálogo canónico adoptado para cada país.

El umbral `humor.minimo_noticias_agregacion` siempre usará el número de noticias únicas del ámbito. Los términos de una noticia multinacional se sumarán una vez por ámbito consultado.

Los endpoints conservarán su forma. En `noticias-influyentes`, la consulta filtra por atribución, pero `canal`, `continente` y `pais` continuarán proyectándose desde la fuente para no romper al frontend. Esta dualidad se documentará como compatibilidad deliberada; la atribución individual detallada queda disponible en persistencia, no en una API nueva.

### Índices y límites de rendimiento

Se crearán índices para:

- `PAIS_ALIAS(idioma, activo)` y su clave normalizada;
- `NOTICIA_PAIS(codigo_pais, id_noticia)` además de su PK inversa;
- noticias pendientes por fecha/versión geográfica;
- búsquedas de noticias por fuente usadas durante una corrección de canal.

Las pruebas de rendimiento medirán compilación del matcher, clasificación por lote y consultas con noticias multinacionales. Se descarta materializar agregados antes de medir. Si el trie en memoria resulta insuficiente, Aho-Corasick queda como evolución posterior, no como dependencia inicial.

## Risks / Trade-offs

- [Priorizar el título puede omitir un país relevante mencionado solo en la descripción cuando el título ya contiene otro país] → Aceptar el sesgo hacia precisión en el MVP y cubrir la regla con escenarios explícitos.
- [Un gazetteer no distingue tema principal, negación ni menciones incidentales] → Documentar la limitación y excluir NER del alcance; revisar muestras reales antes de ampliar aliases.
- [El catálogo completo produce países que el frontend actual no sabe representar] → Mantener frontend fuera de alcance y registrar la limitación; el backend conserva resultados correctos y contratos compatibles.
- [La suma de conteos por país puede superar el conteo continental] → Definir ambos como métricas de pertenencia distintas; el frontend actual puede ocultar noticias sin país por su resta, limitación aceptada fuera de alcance.
- [Validar país y continente rompe clientes que enviaban códigos arbitrarios] → Marcar el cambio como incompatible, normalizar códigos y devolver `400` sin escrituras parciales.
- [Actualizar un canal puede tocar muchas noticias históricas] → Ejecutar actualización set-based dentro de transacción, sostener índices por fuente y medir; no reclasificar texto en esa operación.
- [Una actualización del catálogo puede cambiar el histórico] → Versionar el clasificador y exigir backfill explícito, reproducible y auditable.
- [Cambiar queries antes de completar el backfill ocultaría noticias por país] → Desplegar esquema, seed y backfill antes de activar las consultas nuevas.
- [Aliases retirados siguen referenciados como evidencia] → Desactivarlos en vez de borrarlos hasta que el backfill haya reemplazado referencias.

## Migration Plan

1. Sincronizar y archivar `t-dash-01-dashboard-aggregates` para establecer el contrato vigente de dashboard como base.
2. Añadir la migración de `PAIS`, `PAIS_ALIAS`, `NOTICIA_PAIS` y los campos geográficos nulos de `NOTICIA`, junto con índices y restricciones.
3. Generar, revisar y versionar el catálogo y su manifiesto; documentar atribuciones de licencia.
4. Ejecutar el seed geográfico y el diagnóstico de canales existentes. Corregir códigos o continentes incompatibles antes de habilitar la validación estricta.
5. Desplegar reconocedor, persistencia e integración de captura manteniendo todavía las consultas antiguas de dashboard.
6. Ejecutar el backfill por lotes hasta que todas las noticias tengan la versión objetivo; verificar conteos de pendientes y muestras de evidencia.
7. Activar las consultas del dashboard basadas en atribución y verificar país, continente, evolución, términos y ranking contra PostgreSQL.
8. Actualizar ADR-001, ADR-002, MOD-01, documentación operativa y OpenAPI sin modificar el frontend.

Para rollback, se volverán a usar las consultas por canal y se deshabilitarán clasificación/validación nuevas; las tablas y asociaciones se conservarán durante la reversión para evitar pérdida de evidencia. Solo después de confirmar que ninguna versión desplegada las usa podrá aplicarse el downgrade destructivo de esquema.
