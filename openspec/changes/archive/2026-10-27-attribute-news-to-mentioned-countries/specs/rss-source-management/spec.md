## MODIFIED Requirements

### Requirement: Datos y dominios del canal
Cada canal SHALL exponer un identificador, nombre unico, continente, pais opcional, URL de sitio opcional, estado activo y fecha de alta. El continente MUST pertenecer al dominio `Africa`, `America`, `Antartida`, `Asia`, `Europa` u `Oceania`. Cuando se proporcione, el pais MUST contener exactamente dos letras, SHALL normalizarse a mayusculas, MUST existir en el catálogo geográfico soportado y MUST pertenecer al continente declarado. La validación MUST usar el catálogo local y no depender de una consulta externa en runtime. La URL de sitio MUST usar HTTP o HTTPS. El canal MUST quedar activo por defecto y `id_canal` y `fecha_alta` MUST ser de solo lectura.

#### Scenario: Crear canal con datos minimos
- **WHEN** se crea un canal con un nombre no utilizado y un continente valido
- **THEN** el sistema almacena el canal activo con pais y sitio nulos y responde con todos sus campos observables

#### Scenario: Normalizar el pais
- **WHEN** se crea o actualiza un canal con un pais soportado en minusculas y su continente correspondiente
- **THEN** el sistema persiste y devuelve el codigo con dos letras mayusculas

#### Scenario: Rechazar un pais invalido
- **WHEN** se intenta crear o actualizar un canal con un pais que no contiene exactamente dos letras
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar un pais no soportado
- **WHEN** se intenta crear o actualizar un canal con un codigo de dos letras ausente del catálogo geográfico
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar una combinacion geografica incoherente
- **WHEN** se intenta crear o actualizar un canal con un pais soportado y un continente distinto del continente canónico del país
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar una URL de sitio invalida
- **WHEN** se intenta crear o actualizar un canal con una URL de sitio que no usa HTTP ni HTTPS
- **THEN** el sistema responde `400` y no persiste el cambio

#### Scenario: Rechazar continente fuera del dominio
- **WHEN** se intenta crear un canal con un continente distinto de los seis valores admitidos
- **THEN** el sistema responde `400` y no crea el canal

#### Scenario: Rechazar nombre de canal duplicado
- **WHEN** se intenta crear un canal cuyo nombre ya pertenece a otro canal
- **THEN** el sistema responde `400` y no crea registros adicionales

## ADDED Requirements

### Requirement: Reclasificación histórica por corrección del canal
Cuando se modifique el país o continente de un canal, el sistema SHALL actualizar dentro de la misma operación las atribuciones históricas con origen `fuente` de sus noticias. MUST conservar sin cambios las atribuciones con origen `mencion`. Si el nuevo país es nulo, SHALL eliminar el respaldo de país y conservar esas noticias en el nuevo continente de la fuente; si se asigna posteriormente un país válido, SHALL crear el respaldo para las noticias sin menciones.

#### Scenario: Corregir el país de la fuente
- **WHEN** un canal cambia de un país válido a otro país válido de manera coherente con su continente
- **THEN** sus noticias atribuidas por fuente dejan de pertenecer al país anterior y pasan al país nuevo
- **AND** sus noticias atribuidas por mención conservan sus países detectados

#### Scenario: Quitar el país de un canal
- **WHEN** el país de un canal se actualiza a nulo
- **THEN** se eliminan las asociaciones históricas con origen `fuente`
- **AND** esas noticias continúan perteneciendo al continente vigente del canal

#### Scenario: Completar un país antes ausente
- **WHEN** un canal con país nulo recibe un país válido
- **THEN** sus noticias ya clasificadas sin menciones reciben una asociación de respaldo al país nuevo

#### Scenario: Revertir una corrección incompleta
- **WHEN** falla la actualización de alguna atribución histórica requerida por el cambio del canal
- **THEN** se revierte también la modificación geográfica del canal
