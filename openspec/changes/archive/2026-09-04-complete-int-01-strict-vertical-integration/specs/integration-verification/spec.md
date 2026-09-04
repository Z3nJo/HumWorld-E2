## Purpose

Definir la verificacion automatizada de integracion vertical de HumWorld para que las fronteras entre capas queden cubiertas por escenarios reproducibles, sin dependencias externas no controladas y ejecutados en CI.

## ADDED Requirements

### Requirement: Verificacion vertical API-BD de captura RSS
El sistema SHALL verificar la captura manual de noticias mediante un escenario automatizado que invoque la API publica, procese datos RSS controlados y compruebe el estado persistido en PostgreSQL.

#### Scenario: Capturar noticias desde la API y persistirlas en PostgreSQL
- **WHEN** las migraciones estan aplicadas sobre una base PostgreSQL limpia con al menos una fuente RSS activa
- **AND** se solicita `POST /api/v1/sources/capture` usando entradas RSS controladas sin acceso a Internet real
- **THEN** la respuesta es `200`
- **AND** el cuerpo informa los totales y el resultado por fuente
- **AND** la base conserva las noticias capturadas con `id_fuente`, `guid_origen`, `titulo`, `url`, `idioma` y `fecha_registro`
- **AND** la fuente procesada conserva `fecha_ultima_captura` informada

#### Scenario: Repetir captura manual sin duplicar noticias
- **WHEN** se ejecuta dos veces `POST /api/v1/sources/capture` con las mismas entradas RSS controladas
- **THEN** la segunda respuesta informa duplicados para las noticias ya almacenadas
- **AND** PostgreSQL conserva una sola noticia por combinacion `(id_fuente, guid_origen)`

### Requirement: Verificacion vertical API-BD de configuracion runtime
El sistema SHALL verificar la configuracion runtime mediante escenarios automatizados que invoquen la API publica y comprueben la lectura y escritura real de PostgreSQL.

#### Scenario: Consultar y actualizar configuracion desde la API
- **WHEN** las migraciones estan aplicadas sobre una base PostgreSQL limpia
- **AND** se solicita `GET /api/v1/config`
- **THEN** la respuesta incluye los valores por defecto vigentes
- **WHEN** se solicita `PUT /api/v1/config` con valores validos
- **THEN** la respuesta devuelve los valores actualizados
- **AND** una consulta posterior a `GET /api/v1/config` devuelve los mismos valores persistidos
- **AND** PostgreSQL conserva las claves internas de configuracion sin duplicarlas

#### Scenario: Rechazar configuracion invalida sin modificar persistencia
- **WHEN** existe una configuracion runtime valida persistida
- **AND** se solicita `PUT /api/v1/config` con valores invalidos
- **THEN** la respuesta es `400`
- **AND** una consulta posterior a `GET /api/v1/config` devuelve la configuracion valida previa
- **AND** PostgreSQL no conserva una configuracion invalida

### Requirement: Verificacion Frontend-API para integracion completa
El sistema SHALL verificar que la capa de presentacion consume exclusivamente la API publicada bajo `/api/v1` cuando exista una superficie frontend implementada para captura o configuracion.

#### Scenario: Consumir configuracion desde la UI
- **WHEN** la aplicacion frontend expone una vista de configuracion runtime
- **AND** el backend de prueba publica `/api/v1/config`
- **THEN** la prueba de integracion Frontend-API verifica que la UI lee los valores desde la API
- **AND** la UI no accede directamente a la base de datos ni a rutas no publicadas

#### Scenario: Ejecutar captura desde la UI
- **WHEN** la aplicacion frontend expone una accion de captura manual
- **AND** el backend de prueba publica `POST /api/v1/sources/capture`
- **THEN** la prueba de integracion Frontend-API verifica que la UI invoca la API y presenta el resultado de la ejecucion
- **AND** la UI no simula un resultado exitoso sin respuesta de la API

### Requirement: Ejecucion obligatoria en CI
El sistema MUST ejecutar las pruebas verticales de integracion en el pipeline de CI y MUST fallar el pipeline cuando cualquiera de los escenarios obligatorios falle.

#### Scenario: Pipeline ejecuta integracion vertical
- **WHEN** se ejecuta el workflow de CI sobre una rama protegida o un pull request hacia una rama protegida
- **THEN** el pipeline aplica las migraciones necesarias
- **AND** ejecuta las pruebas API-BD contra PostgreSQL
- **AND** ejecuta las pruebas Frontend-API disponibles cuando exista el frontend
- **AND** finaliza en estado fallido si una verificacion vertical falla

#### Scenario: Registrar evidencia reproducible
- **WHEN** INT-01 se marca como completada
- **THEN** existe evidencia versionada o enlazada al pull request con el comando ejecutado, el resultado del pipeline y los escenarios de integracion cubiertos
