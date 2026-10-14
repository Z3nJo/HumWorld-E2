## Context

El backend aplica la dependencia `api -> services -> repositories -> models`. `Channel` ya persiste `pais`, `url_sitio`, `activo` y `fecha_alta`, y `RssSource` ya persiste `fecha_ultima_captura` y `fecha_alta`; la brecha esta en el contrato HTTP y en los casos de uso. El router, servicio y repositorio de fuentes administran actualmente la creacion agregada de ambos modelos, mientras que la captura filtra solo `RssSource.activa`. Vease `proposal.md` para la motivacion y los deltas `rss-source-management` y `rss-news-capture` para el comportamiento observable.

## Goals / Non-Goals

**Goals:**

- Incorporar la administracion de canales respetando las tres capas y sin acoplar su edicion al identificador de una fuente hija.
- Reutilizar las columnas, restricciones y relaciones existentes sin migracion de base de datos.
- Mantener compatibles las rutas y campos actuales de `/sources`, agregando solamente datos y filtros.
- Aplicar una unica definicion de fuente elegible en captura: fuente activa y canal activo.
- Mantener separadas las decisiones de estado del canal y de cada fuente para que una reactivacion restaure el comportamiento previo de las fuentes que continuan activas.

**Non-Goals:**

- Renombrar los campos JSON existentes al ingles o publicar simultaneamente dos juegos de nombres.
- Crear canales sin fuentes mediante `POST /channels` o trasladar fuentes entre canales.
- Eliminar fisicamente canales, fuentes o noticias desde el nuevo recurso.
- Verificar que un codigo de dos letras pertenezca a un catalogo ISO externo.
- Completar paises o sitios del catalogo seed ni modificar contratos del dashboard o del frontend.

## Decisions

### Recurso de canal independiente y alta agregada conservada

Se agregara un router `/channels` con listado, detalle, reemplazo, actualizacion parcial y desactivacion. La creacion continuara en `POST /sources`, porque esa operacion ya garantiza que un canal nuevo y sus fuentes se confirmen o reviertan juntos. Editar un canal desde `/sources/{source_id}` se descarta: varias fuentes comparten el mismo padre y una ruta de hija ocultaria el efecto sobre sus hermanas.

El adaptador de canales dependera de un servicio de canales y este de un repositorio concreto de canales. La creacion agregada permanecera en el servicio de fuentes. Ambos caminos reutilizaran las mismas reglas de normalizacion y los errores de validacion, ausencia y duplicidad ya traducidos por la aplicacion a `400` y `404`, evitando saltos de capa.

### Representaciones completas sin campos duplicados de escritura

Se definira una representacion de canal con `id_canal`, `nombre`, `continente`, `pais`, `url_sitio`, `activo` y `fecha_alta`. Esa representacion sustituira al resumen incompleto anidado en las respuestas de fuente. La fuente añadira `fecha_ultima_captura` y `fecha_alta`; ninguna fecha aparecera en esquemas de escritura.

Los cuerpos JSON conservaran los nombres de dominio actuales (`nombre`, `continente`, `pais`, `url_sitio`, `activo` y `activa`). Los parametros de consulta nuevos seran `channel_id` y `country`, coherentes con `continent` y `active` ya publicados. Renombrar el contrato o emitir aliases duplicados se descarta por el coste de compatibilidad y la ambiguedad entre el estado del canal y el de la fuente.

### Validacion y semantica de campos opcionales

Una funcion de normalizacion compartida eliminara espacios exteriores del pais, exigira exactamente dos letras ASCII y lo convertira a mayusculas. No consultara un catalogo ISO. `url_sitio` aceptara solamente URL HTTP o HTTPS de hasta 500 caracteres. `pais` y `url_sitio` conservaran `null` como valor valido.

El esquema de `PUT` exigira los cinco campos editables del canal, aunque los dos opcionales puedan ser `null`. El esquema de `PATCH` distinguira campo ausente de campo presente con `null`: permitira limpiar `pais` y `url_sitio`, rechazara `null` en `nombre`, `continente` y `activo`, y rechazara cuerpos sin campos. Esta distincion evita que una actualizacion parcial convierta accidentalmente valores obligatorios en nulos.

### Desactivacion logica sin propagar cambios a las fuentes

`DELETE /channels/{channel_id}` establecera `Channel.activo=false` en una transaccion y sera idempotente para un canal ya inactivo. No actualizara `RssSource.activa`, no eliminara filas y no dependera de la cantidad de fuentes. `PATCH {"activo": true}` reactivara el canal conservando la seleccion individual previa de fuentes.

Se descarta la cascada fisica porque contradice MOD-01, destruiria noticias historicas a traves de la relacion fuente-noticia y haria imposible distinguir una pausa de grupo de la configuracion individual. Tambien se descarta actualizar secuencialmente todas las fuentes, porque perderia esos estados y no representaria el atributo `CANAL.activo` ya persistido.

### Filtros y carga de relaciones

El listado de canales aplicara de manera acumulativa los filtros `continent`, `country` y `active`; sin filtros devolvera activos e inactivos. El listado de fuentes agregara `channel_id` y `country` a los filtros actuales y tambien combinara todos los predicados. Los filtros de pais se normalizaran igual que los cuerpos de canal.

Los repositorios realizaran los joins necesarios y cargaran la relacion de canal antes de devolver entidades al servicio, conservando el orden determinista por identificador y evitando consultas por fila durante la serializacion. Un identificador de canal valido sin fuentes producira una lista vacia, no `404`, porque los filtros de coleccion no representan una consulta de recurso individual.

### Elegibilidad de captura consistente

El recorrido automatico consultara fuentes mediante el predicado conjunto `RssSource.activa AND Channel.activo`. Para una captura manual con `source_ids`, el repositorio recuperara primero todas las fuentes existentes solicitadas junto con su canal; el servicio diferenciara identificadores inexistentes de fuentes no elegibles. Las inexistentes conservaran el `404` atomico actual y las inactivas, ya sea por fuente o canal, se incluiran en `skipped_source_ids`.

Esta separacion evita que una fuente de canal inactivo se confunda con una fuente inexistente y mantiene sin cambios la estructura del reporte manual. El predicado de elegibilidad se centralizara en la logica de captura o en una consulta reutilizable para impedir divergencias entre ejecucion automatica y manual.

### Geografia vigente aplicada al historial

Las noticias no duplicaran continente ni pais. Actualizar la geografia de un canal cambiara deliberadamente la clasificacion de todas sus noticias en consultas posteriores, conforme a la navegacion `NOTICIA -> FUENTE_RSS -> CANAL` de MOD-01. Crear instantaneas geograficas por noticia o impedir la edicion cuando exista historial se descarta porque requeriria cambios de modelo y alteraria el contrato de dashboards fuera de este cambio.

### Estrategia de pruebas

Las pruebas unitarias de servicios cubriran normalizacion, campos anulables, unicidad, actualizacion total y parcial, desactivacion idempotente y preservacion de fuentes. Las pruebas de captura cubriran las cuatro combinaciones de estados de canal y fuente, tanto en recorrido completo como por identificadores. Las pruebas de integracion PostgreSQL verificaran joins, filtros acumulativos, persistencia tras reinicio y ausencia de eliminaciones colaterales. Las pruebas OpenAPI comprobaran rutas, parametros, esquemas, codigos y ausencia del `422` predeterminado.

## Risks / Trade-offs

- [Editar continente o pais reclasifica noticias historicas] -> Documentar el efecto en Swagger y verificarlo mediante la relacion existente; no presentar la operacion como una correccion limitada a noticias futuras.
- [Un codigo de dos letras puede no ser un pais ISO real] -> Mantener la validacion acotada acordada y reservar un catalogo ISO para otro cambio.
- [Los joins adicionales pueden aumentar el coste de los listados y la captura] -> Reutilizar el indice geografico existente, filtrar en PostgreSQL y cargar el canal en la misma consulta.
- [Consumidores antiguos reciben campos adicionales] -> Mantener nombres, tipos y rutas existentes; las ampliaciones JSON son compatibles para clientes que ignoran propiedades desconocidas.
- [Una vuelta a una version anterior ignoraria `Channel.activo`] -> Detener el scheduler antes del rollback y revisar los canales inactivos para evitar que el codigo anterior capture sus fuentes.

## Migration Plan

1. Desplegar primero esquemas, repositorios, servicios y rutas con las pruebas de compatibilidad de `/sources`; no ejecutar Alembic porque no cambia el esquema.
2. Activar el filtro conjunto de captura en el mismo despliegue que expone la administracion de `Channel.activo`, evitando una ventana en que el frontend pueda desactivar un canal sin efecto operativo.
3. Verificar en PostgreSQL un canal activo, uno inactivo y fuentes con estados mixtos; revisar `/api/docs` y ejecutar una captura manual controlada.
4. Permitir que los operadores completen `pais` y `url_sitio` mediante la API; no modificar automaticamente datos existentes ni el seed.

Para rollback, detener primero el scheduler. Como no hay migracion, las rutas y campos de respuesta pueden retirarse sin transformar tablas; antes de volver a una version que ignore `Channel.activo`, se deben identificar los canales inactivos y decidir si se reactivan o si sus fuentes activas se desactivan explicitamente, conservando un registro de sus estados individuales.
