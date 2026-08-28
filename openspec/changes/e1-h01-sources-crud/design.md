## Context

El backend contiene FastAPI y publica Swagger, pero aun no posee rutas funcionales, configuracion de base de datos, modelos, repositorios, servicios, migraciones ni pruebas. ADR-000 exige dependencias `api -> services -> repositories -> models`; ADR-003 fija Python 3.12, FastAPI, Pydantic, SQLAlchemy 2.0, Alembic y PostgreSQL 16; MOD-01 define `Canal` y `FuenteRSS` y sus reglas de integridad.

La especificacion observable se encuentra en `specs/rss-source-management/spec.md`. La base transversal de `INFRA-02` y `CICD-00` ya esta disponible: Docker Compose incorpora PostgreSQL 16 y el pipeline ejecuta pytest contra PostgreSQL. E1-H01 consumira esa infraestructura sin ampliar su alcance funcional.

## Goals / Non-Goals

**Goals:**

- Establecer la primera vertical completa del backend sin romper la separacion por capas.
- Traducir solamente `Canal` y `FuenteRSS` de MOD-01 a persistencia versionada.
- Proporcionar un contrato `/sources` estable para E1-H02, E1-H03, E1-H05 y E4-H04.
- Mantener la logica de negocio testeable sin introducir abstracciones genericas que E1-H01 no necesita.
- Verificar el comportamiento real contra PostgreSQL y documentarlo desde el codigo.

**Non-Goals:**

- Implementar un recurso REST `/channels` independiente.
- Implementar CRUD de canales despues de su alta inicial.
- Trasladar una fuente existente hacia otro canal mediante `PUT` o `PATCH`.
- Descargar, analizar o comprobar remotamente el contenido de una URL RSS.
- Crear seeds, noticias, terminos, configuracion, tareas programadas o interfaz web.
- Introducir autenticacion, autorizacion o segundo nivel de IPTC.

## Decisions

### 1. `/sources` administra fuentes y crea el canal como parte de un agregado

`POST /api/v1/sources` aceptara una de dos variantes mutuamente excluyentes: datos de un canal nuevo junto con `sources` no vacio, o `channel_id` existente junto con `sources` no vacio. La respuesta `201` contendra el canal y las fuentes creadas.

Las operaciones por `source_id` administraran una fuente individual. Las representaciones de fuente incluiran un resumen de canal, evitando una consulta adicional para los consumidores inmediatos. Crear o editar canales mediante `/channels` se descarta porque no es requisito de E1-H01 ni endpoint minimo del Backlog Final.

### 2. Alta multiple en una sola transaccion

El servicio orquestara la creacion del canal y todas sus fuentes mediante una unica transaccion expuesta por los repositorios. Cualquier error de validacion o integridad revierte el conjunto completo. Esto implementa directamente el criterio de asociar una o mas fuentes sin dejar canales creados por una solicitud fallida.

La alternativa de hacer una solicitud por fuente se descarta porque no garantiza atomicidad y obliga al cliente a coordinar estados parciales.

### 3. Arquitectura por capas con repositorios concretos

Los routers se limitaran a traducir HTTP y modelos Pydantic; el servicio aplicara las reglas de negocio; los repositorios concretos encapsularan consultas y transacciones SQLAlchemy; los modelos declarativos representaran el esquema. Para este alcance se usaran repositorios pequenos de canal y fuente, sin crear una unidad de trabajo generica ni una jerarquia adicional de interfaces.

Las pruebas unitarias sustituiran los repositorios con dobles simples definidos en la propia suite. Inyectar directamente una sesion SQLAlchemy en el servicio se descarta porque permitiria construir consultas fuera de `repositories/`, contrario a ADR-000 R-3 y ADR-003 S-4.

### 4. SQLAlchemy sincrono y PostgreSQL mediante psycopg

Se usara la API sincrona de SQLAlchemy 2.0 con el driver psycopg. El volumen y la concurrencia de este CRUD no justifican agregar complejidad asincrona, y FastAPI ejecuta adecuadamente handlers sincronicos en su pool de hilos.

La configuracion del backend normalizara las URLs genericas `postgresql://` entregadas por Docker Compose y CI al dialecto explicito `postgresql+psycopg://`, o construira directamente esta ultima forma, para impedir que SQLAlchemy intente cargar el driver psycopg2 por defecto. Las pruebas de configuracion verificaran esta compatibilidad sin cambiar el contrato transversal de las variables de entorno.

La alternativa asincrona se reserva para una reevaluacion si la captura concurrente demuestra una necesidad medible; adoptarla ahora duplicaria conceptos de sesion y pruebas sin aportar un beneficio observable a E1-H01.

### 5. Dominios cerrados compartidos y restricciones en dos niveles

Continentes, idiomas y categorias IPTC se definiran como enumeraciones de dominio reutilizadas por Pydantic y servicios. La base almacenara texto con restricciones `CHECK`, evitando tipos enum nativos de PostgreSQL que complican futuras migraciones. Las restricciones `UNIQUE` de canal y URL del feed permaneceran ademas en la base para proteger escrituras concurrentes.

Los errores esperables de validacion, duplicidad o integridad se traduciran a `400`; recursos ausentes a `404`; errores inesperados conservaran `500`. Se instalara un manejador para convertir los errores de validacion de entrada de FastAPI al contrato `400` exigido por la DoD, evitando el `422` predeterminado.

### 6. Campos editables y propiedad de datos

`PUT` y `PATCH` modificaran solamente `nombre`, `url_feed`, `categoria_iptc`, `idioma` y `activa`. `id_canal`, los identificadores, `fecha_alta` y `fecha_ultima_captura` no seran editables desde este CRUD; esta ultima sera propiedad de las historias de captura. Los campos adicionales previstos por MOD-01 pueden existir en la persistencia con sus defaults, pero E1-H01 solo expondra los datos exigidos por su contrato.

Eliminar una fuente sera fisico y conservara el canal aunque quede sin fuentes. Las relaciones futuras desde `Noticia` deberan usar borrado en cascada segun MOD-01, pero no se creara anticipadamente la tabla `Noticia`.

### 7. OpenAPI generado desde FastAPI

Los esquemas Pydantic, firmas, codigos, descripciones y ejemplos de las rutas seran la unica fuente del documento OpenAPI publicado en `/api/docs`, conforme a ADR-003 S-1. E1-H01 no mantendra manualmente un segundo contrato OpenAPI estatico.

Los artefactos editables de planificacion permaneceran en `openspec/`, que es la raiz configurada de la CLI. Para cumplir la seccion 4.7 del PDF, una tarea reproducible copiara los contratos finalizados a `opsx/contracts/`; esa copia sera un entregable generado y nunca una segunda fuente editable.

### 8. Estrategia de pruebas

Las pruebas unitarias del servicio usaran dobles simples de repositorio para cubrir validaciones, atomicidad y errores. Las pruebas de API-BD aplicaran migraciones sobre una base PostgreSQL aislada, invocaran FastAPI y comprobaran el CRUD y los filtros minimos. No se usara SQLite como sustituto de integracion porque no reproduce todas las restricciones elegidas para PostgreSQL.

La suite MUST alcanzar al menos 80 % de cobertura sobre el codigo nuevo de E1-H01, aplicando el umbral mas conservador del PDF aunque la DoD permita progresividad en Sprint 1.

## Risks / Trade-offs

- [La infraestructura publica URLs genericas `postgresql://`, mientras E1-H01 adopta psycopg 3] -> Normalizar el dialecto en la configuracion del backend y probar la conexion tanto con la URL de Docker Compose como con la de CI.
- [El alta agregada no ofrece CRUD completo de canales] -> Mantener el limite del Backlog Final; abrir una capacidad separada si una historia futura exige editar o eliminar canales.
- [Una URL sintacticamente valida puede no ser realmente RSS] -> No realizar I/O remoto en este CRUD; E1-H03 y E1-H05 gestionaran lectura y errores de captura.
- [Carreras al crear nombres o URLs duplicados] -> Conservar validacion amigable en servicio y restricciones de unicidad en PostgreSQL, traduciendo la excepcion de integridad.
- [Divergencia entre `openspec/` y la copia entregable] -> Generar `opsx/contracts/` desde la fuente operativa y verificar su sincronizacion, sin editar la copia.

## Migration Plan

1. Partir de la base ya validada de `INFRA-02` y `CICD-00`, conservando el contrato vigente de PostgreSQL 16, `DATABASE_URL` y ejecucion de pytest en CI.
2. Incorporar configuracion y dependencias de persistencia y pruebas.
3. Crear la migracion inicial de `canal` y `fuente_rss` y aplicarla sobre una base vacia.
4. Desplegar modelos, repositorios concretos, servicio y rutas; ejecutar pruebas unitarias y API-BD con cobertura minima de 80 %.
5. Generar la copia entregable en `opsx/contracts/`, levantar Docker, revisar `/api/docs` y conservar evidencia de los tres criterios de aceptacion del Backlog Final.

Para rollback, retirar primero las rutas de la version desplegada y revertir la migracion solo en entornos donde no existan datos que deban conservarse. En un entorno con datos, realizar respaldo antes de eliminar tablas.
