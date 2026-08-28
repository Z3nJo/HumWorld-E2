## Context

Ver `proposal.md` para la motivacion. El repositorio actualmente tiene un workflow inicial que valida Docker Compose y construye servicios, pero el backend todavia se trata como un modulo Node opcional. El stack objetivo necesita que backend pueda evolucionar a Python/FastAPI con PostgreSQL sin que CI omita silenciosamente pruebas relevantes.

## Goals / Non-Goals

**Goals:**
- Declarar PostgreSQL 16 como dependencia base del entorno Compose.
- Entregar un contrato de CI que pueda ejecutar pruebas backend Python contra PostgreSQL.
- Mantener una senal clara de falla cuando pytest, migraciones, cobertura o PostgreSQL fallen.
- Conservar validacion y build Docker como parte del pipeline inicial.
- Evitar que `cicd-00-initial-pipeline` y cambios posteriores compitan por el mismo workflow sin una decision explicita.

**Non-Goals:**
- Implementar endpoints FastAPI o logica de dominio.
- Definir el esquema de base de datos funcional.
- Publicar imagenes Docker o desplegar a un entorno.
- Configurar proteccion de ramas en GitHub.

## Decisions

### Decision: PostgreSQL 16 queda en Docker Compose

Agregar un servicio `postgres` basado en PostgreSQL 16 al archivo Compose del proyecto, con volumen persistente, credenciales configurables, URL de conexion para backend y healthcheck.

Razonamiento: La persistencia no debe aparecer recien en CI o en una historia funcional; debe existir como parte del entorno base que los desarrolladores levantan localmente.

Alternativa considerada: Usar solo un servicio PostgreSQL en GitHub Actions. Se descarta porque dejaria el entorno local sin la dependencia real que usara backend.

### Decision: El backend depende de PostgreSQL saludable

Configurar `depends_on` del backend para esperar el estado saludable de PostgreSQL cuando Compose lo soporte.

Razonamiento: Evita arranques fragiles donde backend intenta conectarse antes de que la base acepte conexiones.

Alternativa considerada: Manejar reintentos solo dentro del backend. Puede seguir siendo util mas adelante, pero no reemplaza una dependencia saludable en Compose para el entorno base.

### Decision: Backend CI se orienta a Python/FastAPI

Reemplazar la deteccion backend basada en `backend/package.json` por una ruta Python que instale `backend/requirements.txt` y ejecute pytest con cobertura cuando exista la superficie Python del backend.

Razonamiento: El backend objetivo no es Node. Mantener el chequeo Node como criterio principal permitiria que un backend Python real quedara sin pruebas.

Alternativa considerada: Mantener ambos caminos backend Node y Python. Se difiere salvo que aparezca un backend Node real; por ahora agregaria ruido y ambiguedad.

### Decision: PostgreSQL se levanta tambien en CI

El workflow debe proveer PostgreSQL para pruebas backend, esperar su healthcheck y exponer la misma forma de conexion esperada por backend.

Razonamiento: Las pruebas backend con persistencia deben ejecutarse contra una base real para detectar fallas de conexion, migracion y dependencias de infraestructura.

Alternativa considerada: Usar SQLite o mocks para CI inicial. Se descarta para este contrato porque el stack objetivo declara PostgreSQL como persistencia.

### Decision: Migraciones son un punto explicito del pipeline

El workflow debe reservar un paso para aplicar migraciones cuando el backend declare el mecanismo del proyecto.

Razonamiento: Aunque el repo aun no tenga migraciones, el pipeline debe preparar la ranura donde se validara que el esquema requerido existe antes de pytest.

Alternativa considerada: Esperar a que E1-H01 defina migraciones y modificar CI despues. Se descarta porque volveria a solapar cambios sobre `.github/workflows/ci.yml`.

### Decision: Cobertura backend minima de 80%

Ejecutar pytest con pytest-cov y exigir una cobertura minima de 80% para el backend cuando existan pruebas backend Python.

Razonamiento: El criterio vuelve objetiva la calidad minima esperada y evita que el pipeline quede verde con una suite insuficiente.

Alternativa considerada: Reportar cobertura sin fallar. Se descarta porque el pedido exige bloquear bajo 80%.

## Risks / Trade-offs

- El backend Python aun no existe en el repo -> Mitigacion: el pipeline debe informar explicitamente la ausencia de `backend/requirements.txt` y dejar claro que pytest se activara cuando el scaffold exista.
- El mecanismo de migraciones aun no esta definido -> Mitigacion: implementar un paso detectable y documentado que ejecute migraciones cuando el backend declare el comando o archivo esperado.
- Dos cambios activos pueden tocar `.github/workflows/ci.yml` -> Mitigacion: resolver primero este contrato o reconciliarlo con `cicd-00-initial-pipeline` antes de aplicar E1-H01.
- Healthcheck de Compose puede variar por version de Docker Compose -> Mitigacion: usar sintaxis compatible con runners actuales y validar con `docker compose config`.

## Migration Plan

1. Actualizar `opsx/docker-compose.yml` con PostgreSQL 16, volumen persistente, variables de entorno, URL para backend, healthcheck y dependencia saludable.
2. Actualizar `.github/workflows/ci.yml` para preparar Python, levantar PostgreSQL, ejecutar migraciones cuando existan y correr pytest con cobertura minima.
3. Validar localmente Docker Compose.
4. Validar el cambio OpenSpec.
5. Confirmar que el workflow resultante cumple el contrato antes de cerrar el cambio.

Rollback: revertir los cambios de `opsx/docker-compose.yml` y `.github/workflows/ci.yml` al estado previo del pipeline inicial.
