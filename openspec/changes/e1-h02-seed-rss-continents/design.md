## Context

E1-H01 aporta las tablas `canal` y `fuente_rss`, sus restricciones de unicidad y dominios, la configuracion de sesiones SQLAlchemy y una migracion Alembic inicial. El ADR-000 asigna el seed reproducible a la capa de datos. La implementacion existente confirma transacciones dentro de operaciones individuales del repositorio de fuentes, por lo que reutilizarlas secuencialmente no garantizaría atomicidad para las seis entradas.

## Goals / Non-Goals

**Goals:**

- Ofrecer un unico comando de backend que cargue el catalogo minimo despues de aplicar migraciones.
- Mantener el catalogo legible, determinista y versionado junto al codigo.
- Resolver las seis entradas dentro de una sola transaccion.
- Reconocer una carga ya aplicada y rechazar colisiones incompatibles.

**Non-Goals:**

- Verificar disponibilidad, formato o contenido remoto de los feeds.
- Crear una API para ejecutar o administrar el seed.
- Introducir pais, URL del sitio u otros datos opcionales del canal.
- Capturar noticias o programar ejecuciones periodicas.
- Cambiar modelos, tablas o migraciones Alembic.

## Decisions

### Catalogo Python minimo

El catalogo se mantendra como datos inmutables dentro del modulo ejecutable del seed. Con solo seis entradas, un archivo JSON separado aumenta la superficie de validacion sin aportar edicion independiente necesaria. Cada entrada declara nombre de canal, continente, nombre de fuente, URL, categoria IPTC, idioma y estado activo.

Catalogo acordado:

| Continente | Canal | Fuente / URL | Categoria | Idioma |
|---|---|---|---|---|
| `Africa` | Africanews | `https://www.africanews.com/feed/rss` | `society` | `en` |
| `America` | CBC News | `https://www.cbc.ca/cmlink/rss-topstories` | `society` | `en` |
| `Antartida` | United States Antarctic Program | `https://www.usap.gov/documents/usapnews.xml` | `science/technology` | `en` |
| `Asia` | Channel News Asia | `https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511` | `society` | `en` |
| `Europa` | Deutsche Welle | `https://rss.dw.com/rdf/rss-en-all` | `society` | `en` |
| `Oceania` | ABC News Australia | `https://www.abc.net.au/news/feed/51120/rss.xml` | `society` | `en` |

Alternativa descartada: mantener el catalogo en JSON o YAML. Seria preferible para un inventario amplio y administrado externamente, pero no para las seis entradas fijas exigidas por esta historia.

### Modulo ejecutable separado de Alembic

El seed se ejecutara explicitamente desde `backend` mediante `python -m app.seeds.sources`, despues de `alembic upgrade head`. No se incorporaran datos editoriales dentro de una migracion de esquema.

Alternativa descartada: una migracion Alembic de datos. Acoplaria URLs cambiantes a la historia irreversible del esquema y haria menos clara la reejecucion del catalogo.

### Una sola transaccion controlada por el seed

El modulo consultara y preparara las seis entradas mediante una unica sesion, usando `flush` cuando necesite identificadores y realizando un solo `commit` al final. Cualquier excepcion causara `rollback`. No encadenara las operaciones actuales del repositorio que confirman cada alta por separado.

### Idempotencia por claves naturales

El canal se identifica por su nombre unico y la fuente por su URL unica. Una entrada ya existente se considera compatible solo cuando conserva los valores funcionales declarados por el catalogo y su asociacion. Una colision con continente, canal asociado, nombre, categoria, idioma o estado diferente detiene toda la operacion; el seed no actualiza datos existentes silenciosamente.

### Pruebas sin dependencia de Internet

La prueba de integracion aplicara migraciones sobre PostgreSQL limpio, ejecutara la carga dos veces y consultara directamente la persistencia. No hara solicitudes HTTP a los proveedores, de acuerdo con el contrato de registro establecido en E1-H01.

## Risks / Trade-offs

- [Una URL puede dejar de publicar RSS despues de ser versionada] → Mantener la comprobacion remota fuera del seed y actualizar el catalogo mediante un cambio revisado cuando corresponda.
- [La asociacion de USAP con `Antartida` es editorial y no corresponde a la sede de la organizacion] → Documentar que esta entrada cubre informacion dedicada al continente y usarla solo para satisfacer el inventario inicial.
- [Una base modificada manualmente puede impedir reejecutar el seed] → Fallar explicitamente y atomicamente en lugar de sobrescribir datos ajenos.
- [El catalogo embebido requiere cambio de codigo para reemplazar una URL] → Aceptable para seis registros versionados; la administracion dinamica ya pertenece al CRUD de E1-H01.

## Migration Plan

1. Aplicar `alembic upgrade head` sobre PostgreSQL.
2. Ejecutar `python -m app.seeds.sources` una vez durante la preparacion del entorno.
3. Verificar seis canales, seis fuentes activas y cobertura de los seis continentes.
4. Ante rollback de la feature, eliminar solamente los registros identificados por las seis claves naturales del catalogo; no se revierte el esquema.
