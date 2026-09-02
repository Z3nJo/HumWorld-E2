## Purpose

Permitir que HumWorld capture periodicamente noticias desde todas las fuentes RSS activas, las persista con trazabilidad temporal y evite duplicados sin detener el recorrido por fallos aislados.

## ADDED Requirements

### Requirement: Programacion automatica configurable
El sistema SHALL programar la captura automatica usando el valor persistido de `captura.periodicidad_minutos` y SHALL usar el valor por defecto `60` cuando el parametro no exista. La primera ejecucion SHALL ocurrir despues de transcurrir el intervalo configurado y las ejecuciones del mismo job MUST NOT superponerse.

#### Scenario: Programar con periodicidad persistida
- **WHEN** el backend inicia con `captura.periodicidad_minutos` persistido
- **THEN** el sistema programa el job de captura con ese intervalo

#### Scenario: Programar con periodicidad por defecto
- **WHEN** el backend inicia sin un valor persistido para `captura.periodicidad_minutos`
- **THEN** el sistema programa el job de captura cada `60` minutos

#### Scenario: Evitar ejecuciones superpuestas
- **WHEN** una captura continua en curso al llegar el siguiente instante programado
- **THEN** el sistema no inicia una segunda instancia concurrente del mismo job

### Requirement: Recorrido de fuentes activas
Cada ejecucion automatica SHALL consultar y procesar todas las fuentes RSS activas al comenzar el recorrido y MUST excluir las fuentes inactivas.

#### Scenario: Capturar todas las fuentes activas
- **WHEN** comienza una ejecucion con varias fuentes activas
- **THEN** el sistema intenta procesar cada una de esas fuentes

#### Scenario: Excluir una fuente inactiva
- **WHEN** una fuente esta registrada con `activa` igual a `false`
- **THEN** el sistema no descarga ni procesa su feed durante la ejecucion

### Requirement: Normalizacion y persistencia de noticias RSS
El sistema SHALL persistir cada entrada RSS valida con `id_fuente`, `guid_origen`, `titulo`, `descripcion` opcional, `url`, el idioma heredado de la fuente, `fecha_publicacion` opcional y `fecha_registro`. `fecha_registro` SHALL representar la fecha y hora en que la noticia fue almacenada y `valor_humor` y `fecha_analisis` SHALL permanecer nulos hasta una historia posterior.

#### Scenario: Persistir una entrada RSS completa
- **WHEN** una fuente activa entrega una entrada con identificador, titulo, enlace y fecha de publicacion
- **THEN** el sistema almacena la noticia asociada a la fuente con sus datos normalizados y una `fecha_registro`

#### Scenario: Persistir una entrada sin fecha de publicacion
- **WHEN** una entrada valida no incluye fecha de publicacion
- **THEN** el sistema almacena la noticia con `fecha_publicacion` nula y `fecha_registro` informada

#### Scenario: Heredar idioma de la fuente
- **WHEN** una entrada valida es capturada desde una fuente declarada en `es` o `en`
- **THEN** la noticia queda registrada con el idioma de esa fuente

#### Scenario: Omitir una entrada sin enlace utilizable
- **WHEN** una entrada RSS no contiene un enlace utilizable para la noticia
- **THEN** el sistema omite esa entrada sin abortar el procesamiento de las restantes

### Requirement: Identificacion y control de duplicados
El sistema MUST identificar una noticia mediante `guid` cuando el item RSS lo entregue y SHALL usar su `link` como `guid_origen` en caso contrario. La combinacion `(id_fuente, guid_origen)` MUST ser unica y una captura repetida MUST NOT crear noticias adicionales para items ya registrados.

#### Scenario: Usar guid publicado por el feed
- **WHEN** una entrada RSS incluye un `guid`
- **THEN** el sistema conserva ese valor como `guid_origen`

#### Scenario: Usar enlace como identificador alternativo
- **WHEN** una entrada no incluye `guid` pero contiene un `link`
- **THEN** el sistema usa el `link` como `guid_origen`

#### Scenario: Repetir una captura
- **WHEN** se procesa nuevamente una entrada ya almacenada para la misma fuente
- **THEN** el sistema conserva una sola noticia para esa combinacion de fuente e identificador

#### Scenario: Resolver inserciones concurrentes del mismo item
- **WHEN** dos intentos tratan de insertar simultaneamente la misma combinacion de fuente e identificador
- **THEN** la base conserva una sola noticia y la ejecucion continua sin duplicarla

### Requirement: Resultado aislado por fuente
El sistema SHALL aislar el procesamiento de cada fuente. Un fallo al descargar o interpretar un feed MUST quedar registrado y MUST NOT impedir el procesamiento de las demas fuentes activas.

#### Scenario: Continuar despues de una fuente fallida
- **WHEN** una fuente activa no puede descargarse o su feed no puede interpretarse
- **THEN** el sistema registra el fallo, no persiste noticias parciales de esa fuente y continua con las restantes

#### Scenario: Completar una fuente con entradas invalidas
- **WHEN** un feed valido contiene entradas validas y entradas que no cumplen los datos minimos
- **THEN** el sistema persiste las entradas validas, omite las invalidas y continua la ejecucion

### Requirement: Registro de ultima captura por fuente
El sistema SHALL actualizar `fecha_ultima_captura` al finalizar correctamente la descarga y procesamiento de una fuente. La fecha SHALL actualizarse aunque todas las entradas hayan sido omitidas por duplicadas y MUST permanecer sin cambios cuando falle la descarga o interpretacion del feed.

#### Scenario: Actualizar fecha despues de insertar noticias
- **WHEN** una fuente se procesa correctamente y produce noticias nuevas
- **THEN** el sistema actualiza su `fecha_ultima_captura`

#### Scenario: Actualizar fecha cuando no hay novedades
- **WHEN** una fuente se procesa correctamente pero todas sus entradas ya estaban registradas
- **THEN** el sistema actualiza su `fecha_ultima_captura` sin crear duplicados

#### Scenario: Conservar fecha despues de un fallo
- **WHEN** una fuente no puede descargarse o interpretarse
- **THEN** el sistema conserva el valor anterior de `fecha_ultima_captura`

### Requirement: Captura verificable y reproducible
La logica de captura MUST poder probarse sin acceso a Internet mediante entradas RSS controladas. La persistencia y el control de duplicados MUST verificarse contra PostgreSQL y el entorno Docker SHALL ejecutar el scheduler con las migraciones aplicadas.

#### Scenario: Probar captura sin red real
- **WHEN** se ejecutan las pruebas unitarias del modulo de captura
- **THEN** los feeds y los resultados de descarga son controlados por dobles de prueba sin depender de servicios externos

#### Scenario: Verificar persistencia en PostgreSQL
- **WHEN** se ejecutan las pruebas de integracion sobre una base migrada
- **THEN** se comprueban la persistencia de noticias, sus fechas, la unicidad compuesta y la actualizacion de la fuente

