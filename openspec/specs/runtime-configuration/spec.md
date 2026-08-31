## Purpose

Permitir que HumWorld gestione parametros globales de ejecucion mediante `/config`, comenzando por la periodicidad configurable del cron de captura y la caducidad de noticias.

## Requirements

### Requirement: Consulta de configuracion runtime
El sistema SHALL exponer `GET /api/v1/config` para recuperar la configuracion runtime minima requerida por el backend, incluyendo la periodicidad de captura y la caducidad de noticias.

#### Scenario: Consultar configuracion en base limpia
- **WHEN** las migraciones estan aplicadas sobre una base PostgreSQL limpia
- **AND** se solicita `GET /api/v1/config`
- **THEN** la respuesta es `200`
- **AND** el cuerpo incluye `captura_periodicidad_minutos` con valor `60`
- **AND** el cuerpo incluye `noticias_caducidad_dias` con valor `30`

#### Scenario: Consultar configuracion persistida
- **WHEN** existen valores persistidos para `captura.periodicidad_minutos` y `noticias.caducidad_dias`
- **AND** se solicita `GET /api/v1/config`
- **THEN** la respuesta devuelve esos valores como `captura_periodicidad_minutos` y `noticias_caducidad_dias`

### Requirement: Actualizacion de periodicidad de captura
El sistema SHALL exponer `PUT /api/v1/config` para actualizar y persistir la configuracion runtime completa, incluyendo `captura.periodicidad_minutos`.

#### Scenario: Actualizar configuracion con valores validos
- **WHEN** se solicita `PUT /api/v1/config` con `captura_periodicidad_minutos` y `noticias_caducidad_dias` iguales a enteros positivos
- **THEN** la respuesta es `200`
- **AND** devuelve ambos valores actualizados
- **AND** una consulta posterior a `GET /api/v1/config` recupera los mismos valores

#### Scenario: Reemplazar valor existente
- **WHEN** ya existen `captura.periodicidad_minutos` y `noticias.caducidad_dias`
- **AND** se solicita `PUT /api/v1/config` con otros enteros positivos
- **THEN** los registros persistidos se actualizan sin crear claves duplicadas

### Requirement: Actualizacion de caducidad de noticias
El sistema SHALL permitir actualizar y persistir el parametro `noticias.caducidad_dias` mediante `PUT /api/v1/config`.

#### Scenario: Actualizar caducidad con valor valido
- **WHEN** se solicita `PUT /api/v1/config` con `noticias_caducidad_dias` igual a un entero positivo y el resto de la configuracion runtime valida
- **THEN** la respuesta es `200`
- **AND** devuelve la caducidad actualizada
- **AND** una consulta posterior a `GET /api/v1/config` recupera el mismo valor

### Requirement: Validacion del valor de periodicidad
El sistema MUST rechazar valores de periodicidad que no sean enteros positivos.

#### Scenario: Rechazar periodicidad menor al minimo
- **WHEN** se solicita `PUT /api/v1/config` con `captura_periodicidad_minutos` menor que `1`
- **THEN** la respuesta es `400`
- **AND** el valor persistido previamente no cambia

#### Scenario: Rechazar cuerpo invalido
- **WHEN** se solicita `PUT /api/v1/config` sin `captura_periodicidad_minutos` o con un tipo incompatible
- **THEN** la respuesta es `400`
- **AND** no se persiste una configuracion invalida

### Requirement: Validacion del valor de caducidad
El sistema MUST rechazar valores de caducidad que no sean enteros positivos.

#### Scenario: Rechazar caducidad menor al minimo
- **WHEN** se solicita `PUT /api/v1/config` con `noticias_caducidad_dias` menor que `1`
- **THEN** la respuesta es `400`
- **AND** los valores persistidos previamente no cambian

#### Scenario: Rechazar cuerpo invalido para caducidad
- **WHEN** se solicita `PUT /api/v1/config` sin `noticias_caducidad_dias` o con un tipo incompatible
- **THEN** la respuesta es `400`
- **AND** no se persiste una configuracion invalida

### Requirement: Persistencia clave-valor de configuracion
El sistema SHALL persistir los parametros runtime en una tabla de configuracion de tipo clave-valor compatible con MOD-01.

#### Scenario: Guardar metadatos del parametro de periodicidad
- **WHEN** se crea o actualiza el parametro de periodicidad
- **THEN** la base conserva su clave `captura.periodicidad_minutos`
- **AND** conserva tipo `entero`
- **AND** conserva una descripcion legible
- **AND** registra la fecha de modificacion

#### Scenario: Guardar metadatos del parametro de caducidad
- **WHEN** se crea o actualiza el parametro de caducidad
- **THEN** la base conserva su clave `noticias.caducidad_dias`
- **AND** conserva tipo `entero`
- **AND** conserva una descripcion legible
- **AND** registra la fecha de modificacion
