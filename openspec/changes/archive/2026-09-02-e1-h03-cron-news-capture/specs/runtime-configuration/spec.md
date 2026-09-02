## MODIFIED Requirements

### Requirement: Actualizacion de periodicidad de captura
El sistema SHALL exponer `PUT /api/v1/config` para actualizar y persistir la configuracion runtime completa, incluyendo `captura.periodicidad_minutos`. Cuando el scheduler de captura se encuentre activo, el sistema SHALL aplicar el nuevo intervalo al job existente sin reiniciar el backend y sin iniciar una captura inmediata.

#### Scenario: Actualizar configuracion con valores validos
- **WHEN** se solicita `PUT /api/v1/config` con `captura_periodicidad_minutos` y `noticias_caducidad_dias` iguales a enteros positivos
- **THEN** la respuesta es `200`
- **AND** devuelve ambos valores actualizados
- **AND** una consulta posterior a `GET /api/v1/config` recupera los mismos valores

#### Scenario: Reemplazar valor existente
- **WHEN** ya existen `captura.periodicidad_minutos` y `noticias.caducidad_dias`
- **AND** se solicita `PUT /api/v1/config` con otros enteros positivos
- **THEN** los registros persistidos se actualizan sin crear claves duplicadas

#### Scenario: Reprogramar el cron en caliente
- **WHEN** el scheduler esta activo y `PUT /api/v1/config` actualiza correctamente `captura_periodicidad_minutos`
- **THEN** el job de captura adopta el nuevo intervalo sin reiniciar el backend
- **AND** su proxima ejecucion queda programada despues del nuevo intervalo

