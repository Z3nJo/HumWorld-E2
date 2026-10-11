## Context

El backend ya persiste `NOTICIA.valor_humor` y el desglose histórico de cada análisis en `NOTICIA_TERMINO`, con `aporte_humor` y `ocurrencias` por término. También dispone de índices sobre `NOTICIA.fecha_registro` y `CANAL(continente, pais)`, y relaciona noticias con su geografía mediante fuente y canal. ADR-001 fija el promedio plano, la exclusión de valores nulos, el umbral de suficiencia, el uso de `fecha_registro`, el redondeo de agregados y el significado del aporte persistido. Véanse `proposal.md` y `specs/dashboard-aggregation/spec.md` para la motivación y el contrato observable.

La implementación debe respetar la arquitectura de tres capas existente: el adaptador REST valida y serializa, el servicio coordina reglas del caso de uso y el repositorio ejecuta la consulta SQLAlchemy sobre PostgreSQL.

## Goals / Non-Goals

**Goals:**

- Resolver el promedio y conteo en PostgreSQL sin cargar noticias completas en memoria.
- Resolver en PostgreSQL la agregación y el orden de hasta 32 términos influyentes.
- Mantener una única semántica temporal UTC para rangos de uno o varios días.
- Reutilizar el parámetro vigente `humor.minimo_noticias_agregacion`.
- Compartir la validación del rango y los filtros entre las dos consultas.
- Cubrir ambos contratos con pruebas unitarias y pruebas de integración contra PostgreSQL.

**Non-Goals:**

- Crear tablas, vistas materializadas o migraciones.
- Incorporar rangos disponibles, ventanas predefinidas o parámetros de límite.
- Exponer consultas de noticias individuales.
- Modificar canales, fuentes, seeds, captura RSS o frontend.
- Validar que el país almacenado pertenezca geopolíticamente al continente; ambos filtros se aplican conjuntamente sobre los datos persistidos.

## Decisions

### Endpoint de agregados con granularidad determinada por los filtros

`GET /api/v1/dashboards` devolverá `fecha_desde`, `fecha_hasta`, `continente`, `pais` y `agregados`. Sin filtro geográfico, `agregados` contendrá los seis continentes en el orden del dominio. Con `continente`, contendrá un único agregado continental; con `continente` y `pais`, un único agregado del país.

Esto mantiene un contrato pequeño y permite poblar el mapa continental con una petición. Se descartan subrutas de agregación y un parámetro `group_by` porque ampliarían el contrato más allá de T-DASH-01.

### Subruta para términos influyentes

`GET /api/v1/dashboards/nube-palabras` reutilizará el rango y los filtros geográficos, pero devolverá una lista `terminos` preparada para las vistas de nube y tabla del mockup. El límite será fijo en 32; no se expondrá un parámetro de paginación o cantidad en esta entrega.

El repositorio partirá de `NOTICIA_TERMINO`, enlazará `TERMINO`, `NOTICIA`, `FUENTE_RSS` y `CANAL`, y solo considerará noticias evaluables dentro del intervalo y ámbito seleccionados. Agrupará por la identidad canónica del término y calculará `peso = SUM(ABS(aporte_humor))`, `aporte_total = SUM(aporte_humor)` y `frecuencia = SUM(ocurrencias)`. Ordenará por `peso DESC`, `frecuencia DESC` e `id_termino ASC` antes de aplicar `LIMIT 32`.

El valor absoluto se aplica a cada aporte antes de sumar para que contribuciones de signos distintos no reduzcan artificialmente la influencia. El signo acumulado se conserva por separado en `aporte_total`, que permite al frontend decidir el color. Se descarta calcular desde `TERMINO.valor`, porque ese valor puede editarse después del análisis y no representa necesariamente el aporte histórico persistido.

Los términos inactivos no se filtrarán: la desactivación afecta análisis futuros, mientras que sus filas históricas en `NOTICIA_TERMINO` siguen explicando las noticias ya analizadas. La palabra y el idioma se obtendrán de `TERMINO` para serializar la identidad canónica actual.

### Fechas de calendario convertidas a un intervalo semiabierto UTC

Los adaptadores recibirán `date` para ambos parámetros y una lógica compartida los convertirá a instantes conscientes de zona: `[fecha_desde 00:00 UTC, fecha_hasta + 1 día 00:00 UTC)`. El intervalo semiabierto evita fabricar una hora final y conserva la experiencia inclusiva del mockup.

Se descarta `fecha` más `ventana` porque acoplaría el backend a los controles actuales “Día” y “7 días”. El frontend podrá calcular los dos extremos para cualquier ventana futura.

### Agregación directa sobre noticias persistidas

El repositorio ejecutará `AVG(valor_humor)` y `COUNT(valor_humor)` sobre `NOTICIA`, enlazando `FUENTE_RSS` y `CANAL`, filtrando el intervalo y `valor_humor IS NOT NULL`. Sin filtro geográfico agrupará por continente; con filtros calculará el ámbito solicitado.

El servicio completará los continentes sin filas con `humor = null` y `noticias = 0`, resolverá `suficiente` con `humor.minimo_noticias_agregacion` y cuantizará el promedio a tres decimales conforme a ADR-001. Así el repositorio queda limitado a datos y el significado de ausencia o suficiencia permanece en lógica de negocio.

### Validación geográfica acotada

`continente` reutilizará el dominio cerrado existente. `pais` aceptará exactamente dos letras, se normalizará a mayúsculas y requerirá `continente`; la consulta aplicará ambos predicados. Un par válido sin coincidencias devolverá un agregado sin datos, no `404`.

Se descarta incorporar un catálogo ISO o cambiar `/sources`, porque T-DASH-01 solo consulta la geografía ya persistida.

### Integración con la estructura existente

Se añadirán las dos rutas bajo `/dashboards`, modelos Pydantic de respuesta, servicios de consulta y acceso de lectura para agregados y términos influyentes. El router se registrará bajo `/api/v1` y usará las dependencias de sesión existentes; la consulta agregada conservará además la configuración de suficiencia. No se agregan dependencias externas.

Las pruebas unitarias aislarán los servicios mediante dobles de repositorio y configuración. Las pruebas HTTP comprobarán validación y serialización. Las pruebas marcadas como integración comprobarán joins, promedios, nulos, límites UTC, suma absoluta por aporte, acumulación con signo, frecuencia, términos inactivos, desempates y límite de 32 contra PostgreSQL migrado.

## Risks / Trade-offs

- [Rangos extensos aumentan el coste de la agregación en tiempo de petición] → Usar la consulta agregada en PostgreSQL y los índices existentes; medir antes de considerar materialización fuera de este cambio.
- [Agrupar y ordenar por `SUM(ABS(aporte_humor))` puede resultar costoso en rangos extensos] → Filtrar primero por fecha y geografía, agregar y limitar a 32 en PostgreSQL, y medir antes de proponer índices o materialización en otro cambio.
- [La palabra de un término histórico puede haber sido editada] → Mantener el aporte persistido como fuente del cálculo y usar la identidad canónica actual solo como etiqueta de respuesta.
- [Los canales actuales pueden tener `pais` nulo] → Devolver correctamente resultados vacíos para filtros por país y conservar esas noticias en el agregado continental, sin ampliar esta tarea a la carga de países.
- [La media de `NUMERIC(4,3)` puede producir más decimales] → Mantener precisión decimal durante la consulta y redondear una sola vez a tres decimales en el límite de respuesta.
- [La interpretación local de una fecha puede diferir de UTC] → Documentar y probar explícitamente el corte UTC consumido por el mockup.

## Migration Plan

1. Desplegar `/api/v1/dashboards` y `/api/v1/dashboards/nube-palabras`; no hay migración de base de datos ni transformación de datos.
2. Verificar las dos operaciones publicadas en OpenAPI y ejecutar las suites unitarias y de integración PostgreSQL.
3. Para revertir, retirar las rutas y módulos incorporados por este cambio; los datos persistidos permanecen intactos.
