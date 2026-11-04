# python-postgres-cicd-stack Specification

## Purpose

Define el contrato minimo de CI/CD y Docker Compose para que HumWorld pueda desarrollar un backend Python/FastAPI respaldado por PostgreSQL de forma verificable.

## Requirements

### Requirement: El entorno Compose provee PostgreSQL persistente
El entorno Docker Compose SHALL incluir un servicio PostgreSQL 16 con almacenamiento persistente y credenciales configurables para uso del backend.

#### Scenario: Compose declara PostgreSQL con persistencia
- **WHEN** se valida la configuracion Docker Compose del proyecto
- **THEN** la configuracion incluye un servicio PostgreSQL 16 con un volumen persistente asociado

#### Scenario: Compose expone credenciales de base de datos
- **WHEN** el backend se ejecuta mediante Docker Compose
- **THEN** el backend recibe una URL de conexion o variables equivalentes para conectarse a PostgreSQL

### Requirement: El backend espera PostgreSQL saludable en Compose
El entorno Docker Compose SHALL definir un healthcheck para PostgreSQL y SHALL iniciar el backend despues de que PostgreSQL este saludable.

#### Scenario: PostgreSQL reporta salud antes del backend
- **WHEN** se levanta el entorno con Docker Compose
- **THEN** PostgreSQL ejecuta un healthcheck verificable
- **AND** el backend depende del estado saludable de PostgreSQL

#### Scenario: PostgreSQL no esta saludable
- **WHEN** PostgreSQL no supera su healthcheck
- **THEN** Docker Compose no considera satisfecha la dependencia saludable requerida por el backend

### Requirement: El pipeline prepara el backend Python
El pipeline SHALL preparar el entorno Python del backend instalando sus dependencias declaradas antes de ejecutar pruebas backend.

#### Scenario: Existen dependencias Python del backend
- **WHEN** el repositorio contiene `backend/requirements.txt`
- **THEN** el pipeline instala esas dependencias antes de ejecutar pruebas backend

#### Scenario: No existe aun la superficie Python del backend
- **WHEN** el repositorio no contiene `backend/requirements.txt`
- **THEN** el pipeline informa explicitamente que las pruebas backend Python no pueden ejecutarse todavia

### Requirement: El pipeline provee PostgreSQL para pruebas backend
El pipeline SHALL levantar PostgreSQL en CI y esperar a que este saludable antes de ejecutar pruebas backend.

#### Scenario: Las pruebas backend requieren base de datos
- **WHEN** el pipeline ejecuta pruebas backend
- **THEN** PostgreSQL esta disponible y saludable para esas pruebas

#### Scenario: PostgreSQL falla en CI
- **WHEN** PostgreSQL no queda saludable en CI
- **THEN** el pipeline falla antes de reportar las pruebas backend como exitosas

### Requirement: El pipeline aplica migraciones backend antes de pruebas
El pipeline SHALL ejecutar migraciones de base de datos antes de las pruebas backend cuando el backend declare un mecanismo de migracion.

#### Scenario: El backend declara migraciones
- **WHEN** el backend expone un mecanismo de migracion reconocido por el proyecto
- **THEN** el pipeline aplica las migraciones contra PostgreSQL antes de ejecutar pruebas backend

#### Scenario: El backend aun no declara migraciones
- **WHEN** el backend no expone un mecanismo de migracion
- **THEN** el pipeline informa explicitamente que no hay migraciones backend que aplicar

### Requirement: El pipeline ejecuta pytest con cobertura minima
El pipeline SHALL ejecutar pruebas backend con `pytest` y SHALL fallar si la cobertura reportada queda bajo 80%.

#### Scenario: Las pruebas backend cumplen cobertura minima
- **WHEN** `pytest` finaliza exitosamente y la cobertura backend es al menos 80%
- **THEN** GitHub Actions marca el chequeo backend como exitoso

#### Scenario: Las pruebas backend fallan
- **WHEN** `pytest` reporta una falla de pruebas
- **THEN** GitHub Actions marca el workflow como fallido

#### Scenario: La cobertura backend queda bajo el minimo
- **WHEN** la cobertura backend reportada es inferior a 80%
- **THEN** GitHub Actions marca el workflow como fallido

### Requirement: El pipeline conserva validacion Docker
El pipeline SHALL validar la configuracion Docker Compose y construir los servicios Docker definidos por el proyecto.

#### Scenario: Compose y builds Docker son validos
- **WHEN** el pipeline se ejecuta contra el repositorio
- **THEN** valida la configuracion Docker Compose
- **AND** construye los servicios Docker definidos por la configuracion del proyecto

#### Scenario: La configuracion o build Docker falla
- **WHEN** Docker Compose no puede validarse o algun servicio Docker no puede construirse
- **THEN** GitHub Actions marca el workflow como fallido

### Requirement: Preparación de pnpm mediante una acción fijada a commit

El workflow de CI SHALL referenciar todos sus usos de `pnpm/action-setup` mediante un mismo SHA completo de commit de 40 caracteres hexadecimales cuya procedencia se haya verificado en el repositorio oficial. MUST NOT usar etiquetas, ramas o SHA abreviados para esos pasos. La versión de la acción correspondiente SHALL quedar identificada mediante un comentario junto a cada referencia.

El cambio SHALL conservar la preparación de pnpm desde `packageManager` de `frontend/package.json` y la ejecución de los chequeos existentes. Las futuras actualizaciones de esa acción SHALL revisar la nueva revisión oficial y actualizar conjuntamente las referencias y sus comentarios.

#### Scenario: Preparar pnpm antes de lint y pruebas
- **WHEN** GitHub Actions ejecuta los pasos que preparan pnpm para los chequeos frontend
- **THEN** ambos utilizan el mismo SHA completo de un commit verificado del repositorio oficial de la acción
- **AND** conservan `package_json_file: frontend/package.json`
- **AND** se ejecutan lint y las pruebas con la versión de pnpm declarada por el proyecto

#### Scenario: Desplazar una etiqueta del proveedor
- **WHEN** el proveedor modifica la referencia de una etiqueta después de fijar el workflow
- **THEN** ese movimiento no cambia el commit de la acción seleccionado por el workflow

#### Scenario: Actualizar la acción de forma explícita
- **WHEN** se decide actualizar la acción instaladora de pnpm
- **THEN** se verifica el commit nuevo en el repositorio oficial y se actualizan juntos los SHA y comentarios de todos sus usos en el workflow
