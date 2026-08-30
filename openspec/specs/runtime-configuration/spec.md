## Purpose

Permitir que HumWorld gestione parametros globales de ejecucion mediante `/config`, comenzando por la periodicidad configurable del cron de captura.

## Requirements

### Requirement: Consulta de configuracion runtime
El sistema SHALL exponer `GET /api/v1/config` para recuperar la configuracion runtime minima requerida por el backend.

#### Scenario: Consultar configuracion en base limpia
- **WHEN** las migraciones estan aplicadas sobre una base PostgreSQL limpia
- **AND** se solicita `GET /api/v1/config`
- **THEN** la respuesta es `200`
- **AND** el cuerpo incluye `captura_periodicidad_minutos` con valor `60`

#### Scenario: Consultar configuracion persistida
- **WHEN** existe un valor persistido para `captura.periodicidad_minutos`
- **AND** se solicita `GET /api/v1/config`
- **THEN** la respuesta devuelve ese valor como `captura_periodicidad_minutos`

### Requirement: Actualizacion de periodicidad de captura
El sistema SHALL exponer `PUT /api/v1/config` para actualizar y persistir el parametro `captura.periodicidad_minutos`.

#### Scenario: Actualizar periodicidad con valor valido
- **WHEN** se solicita `PUT /api/v1/config` con `captura_periodicidad_minutos` igual a un entero positivo
- **THEN** la respuesta es `200`
- **AND** devuelve el valor actualizado
- **AND** una consulta posterior a `GET /api/v1/config` recupera el mismo valor

#### Scenario: Reemplazar valor existente
- **WHEN** ya existe `captura.periodicidad_minutos`
- **AND** se solicita `PUT /api/v1/config` con otro entero positivo
- **THEN** el registro persistido se actualiza sin crear claves duplicadas

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

### Requirement: Persistencia clave-valor de configuracion
El sistema SHALL persistir `captura.periodicidad_minutos` en una tabla de configuracion de tipo clave-valor compatible con MOD-01.

#### Scenario: Guardar metadatos del parametro
- **WHEN** se crea o actualiza el parametro de periodicidad
- **THEN** la base conserva su clave `captura.periodicidad_minutos`
- **AND** conserva tipo `entero`
- **AND** conserva una descripcion legible
- **AND** registra la fecha de modificacion
