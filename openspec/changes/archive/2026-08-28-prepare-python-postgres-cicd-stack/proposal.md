## Why

HumWorld necesita preparar su CI/CD y entorno Compose para el stack tecnologico objetivo antes de que las historias funcionales dependan de el. El pipeline actual valida contenedores base, pero no garantiza que un backend Python/FastAPI pueda probarse contra PostgreSQL con cobertura minima.

## What Changes

- Agregar PostgreSQL 16 al entorno Docker Compose con volumen persistente, credenciales, URL de conexion, healthcheck y dependencia saludable desde backend.
- Preparar el workflow de GitHub Actions para backend Python/FastAPI instalando `backend/requirements.txt` cuando exista.
- Levantar PostgreSQL en CI antes de ejecutar pruebas backend.
- Incorporar un punto explicito para aplicar migraciones backend antes de las pruebas cuando el backend declare un mecanismo de migracion.
- Ejecutar `pytest` y `pytest-cov` para backend Python cuando exista la superficie de pruebas.
- Hacer fallar el pipeline si la cobertura backend queda bajo 80%.
- Mantener despliegue, publicacion de imagenes y proteccion de ramas fuera del alcance.

## Capabilities

### New Capabilities

- `python-postgres-cicd-stack`: Cubre el contrato de CI/CD y entorno Docker Compose requerido para backend Python/FastAPI con persistencia PostgreSQL.

### Modified Capabilities

- Ninguna.

## Impact

- Afecta `opsx/docker-compose.yml` y la configuracion de servicios locales.
- Afecta `.github/workflows/ci.yml` y la ejecucion de pruebas backend en GitHub Actions.
- Introduce PostgreSQL 16 como dependencia de infraestructura local y de CI.
- Prepara el repositorio para `backend/requirements.txt`, pruebas `pytest`, cobertura y migraciones de backend.
- No cambia APIs de aplicacion, modelos de dominio ni comportamiento funcional visible para usuarios finales.
