## Purpose

Proporcionar una carga inicial versionada y repetible que deje disponibles en PostgreSQL fuentes RSS activas para los seis continentes admitidos por HumWorld.

## ADDED Requirements

### Requirement: Cobertura inicial de continentes
El sistema SHALL proporcionar un seed versionado que cree exactamente un canal y una fuente RSS activa para cada uno de los continentes `Africa`, `America`, `Antartida`, `Asia`, `Europa` y `Oceania`. Cada registro MUST respetar los dominios de idioma y categoria IPTC definidos por la gestion de fuentes RSS.

#### Scenario: Ejecutar el seed sobre una base limpia
- **WHEN** se aplican las migraciones sobre una base PostgreSQL limpia y se ejecuta el seed
- **THEN** quedan persistidos seis canales y seis fuentes RSS activas, con exactamente una fuente asociada a cada continente admitido

#### Scenario: Consultar la cobertura resultante
- **WHEN** finaliza correctamente el seed y se consultan las fuentes persistidas por continente
- **THEN** cada uno de los seis continentes devuelve al menos una fuente RSS activa

### Requirement: Ejecucion reproducible e idempotente
El seed SHALL poder ejecutarse nuevamente sobre los registros que el mismo creo sin duplicar canales ni fuentes y MUST conservar los mismos datos funcionales.

#### Scenario: Reejecutar el seed sin cambios
- **WHEN** el seed se ejecuta por segunda vez sobre una base que contiene exactamente su carga inicial
- **THEN** la ejecucion finaliza correctamente y se mantienen seis canales y seis fuentes sin duplicados

#### Scenario: Detectar datos incompatibles
- **WHEN** existe un canal o una URL del catalogo con datos incompatibles con la definicion versionada
- **THEN** el seed falla con un mensaje claro y no sustituye silenciosamente los datos existentes

### Requirement: Carga atomica
La carga inicial SHALL ejecutarse como una unica unidad atomica, de modo que un error en cualquier registro MUST revertir todos los cambios realizados por esa ejecucion.

#### Scenario: Revertir una carga fallida
- **WHEN** cualquier entrada del catalogo incumple una restriccion o entra en conflicto con datos existentes
- **THEN** la ejecucion falla y la base conserva el estado que tenia antes de iniciar el seed

### Requirement: Ejecucion independiente del acceso remoto
El seed SHALL registrar las URLs versionadas sin descargar, analizar ni comprobar remotamente el contenido de los feeds.

#### Scenario: Ejecutar sin consultar proveedores RSS
- **WHEN** se ejecuta el seed con PostgreSQL disponible y los proveedores externos no son accesibles
- **THEN** la carga puede finalizar usando exclusivamente los datos versionados y la base de datos
