# frontend/sources-ui Specification

## Purpose

Proporcionar una pantalla de administración de fuentes y canales RSS que reproduzca con fidelidad pixel-perfect la experiencia visual del prototipo de HumWorld (`HumWorld Prototipo.html`, ruta `#/fuentes`) y conecte todas las operaciones a la API REST real de backend (`GET /channels`, `GET /sources`, `POST /sources`, `PATCH /channels/{id}`, `DELETE /channels/{id}`, `PATCH /sources/{id}`, `DELETE /sources/{id}`).

## Vocabulary Mapping

| UI (prototipo) | Backend | Código interno |
|---|---|---|
| "Fuente" (fila principal) | `canal` (`/channels`) | `Channel` |
| "Canal RSS" (subfila) | `fuente_rss` (`/sources`) | `RssSource` |
| Fuente.url | `canal.url_sitio` | `siteUrl` |
| Fuente.activa | `canal.activo` | `Channel.active` |
| Canal.url_rss | `fuente_rss.url_feed` | `feedUrl` |
| Canal.categoria | `fuente_rss.categoria_iptc` | `category` / `iptcCategory` |
| Canal.activo | `fuente_rss.activa` | `RssSource.active` |
| Idioma de la fuente | `fuente_rss.idioma` (por feed) | `languages` (derivado) |
| País | `canal.pais` (por medio, ISO-2 o null) | `Channel.country` |

## Requirements

### Requirement: Renderizado idéntico al prototipo de interfaz

La interfaz SHALL conservar los estilos, tipografías (Newsreader, IBM Plex Sans, IBM Plex Mono), componentes (`.sw`, `.pill`, `.seg`, `.sel`, `.inp`, `.btn`, `.drawer`, `.modal`, `.t`, `.sub`, `.empty`, `.meta`, `.help`, `.errtxt`), estructura de tabla y responsive (≤820px) definidos en el prototipo de HumWorld.

#### Scenario: Carga inicial
- **WHEN** el usuario navega a `/fuentes`
- **THEN** la aplicación consulta en paralelo `GET /channels` y `GET /sources`
- **AND** agrupa las fuentes RSS bajo sus respectivos canales, ordenados por `id_canal` ascendente
- **AND** expande automáticamente el primer canal de la lista
- **AND** muestra el contador `{n} fuentes · {m} canales` según los filtros aplicados
- **AND** muestra las pills de idioma (ES, EN o ambas) derivadas de los feeds del canal

#### Scenario: Filtrado local
- **WHEN** el usuario selecciona un continente o un estado (Todas, Activas, Inactivas)
- **THEN** el filtro se aplica localmente sobre todos los datos cargados sin realizar peticiones redundantes

### Requirement: Gestión de fuentes y canales con la API real

La interfaz SHALL soportar creación, edición, activación/desactivación y desactivación lógica mediante las rutas de `/api/v1`.

#### Scenario: Activación y desactivación optimista
- **WHEN** el usuario acciona el interruptor de un medio
- **THEN** se actualiza inmediatamente la UI y se envía `PATCH /channels/{id} { activo }`
- **AND** ante error se revierte el estado optimista y se notifica el fallo
- **WHEN** el usuario acciona el interruptor de un canal RSS
- **THEN** se actualiza inmediatamente la UI y se envía `PATCH /sources/{id} { activa }`
- **AND** ante error se revierte el estado optimista y se notifica el fallo

#### Scenario: Creación de fuente con canales (POST /sources)
- **WHEN** el usuario completa el drawer con Nombre, URL del sitio, Idioma, Continente, País y al menos un canal RSS
- **THEN** se envía un payload atómico `POST /sources` con `{ channel, sources }`
- **AND** el nombre de cada fuente RSS se genera automáticamente como `"{medio} · {categoría IPTC}"` (máx. 150 caracteres)
- **AND** tras éxito se muestra toast confirmatorio, se recargan datos y se expande el nuevo medio

#### Scenario: Edición de fuente con cálculo de diferencias (diff secuencial)
- **WHEN** el usuario guarda cambios en una fuente existente
- **THEN** se ejecuta secuencialmente: `PATCH /channels/{id}` (si cambiaron atributos del medio) → `PATCH /sources/{id}` (por cada feed modificado) → `POST /sources { channel_id, sources }` (por feeds añadidos) → `DELETE /sources/{id}` (por feeds eliminados)
- **AND** ante error en cualquier paso se detiene el proceso, se recargan datos y se mantiene el drawer abierto mostrando el error

#### Scenario: Desactivación lógica de medio (DELETE /channels/{id})
- **WHEN** el usuario pulsa «Eliminar» en una fuente
- **THEN** se muestra un modal veraz indicando que se desactivará la fuente conservando sus canales RSS y noticias
- **AND** al confirmar se ejecuta `DELETE /channels/{id}`, desactivando el medio en backend

### Requirement: Tratamiento robusto de errores de API

La interfaz SHALL procesar respuestas de error del backend (400, 404, 500) y parsear listas de validación de Pydantic concatenando los mensajes legibles. Si ocurre un error 400 por duplicidad, el mensaje permanece visible en toast y el drawer no se cierra para evitar pérdida de datos.
