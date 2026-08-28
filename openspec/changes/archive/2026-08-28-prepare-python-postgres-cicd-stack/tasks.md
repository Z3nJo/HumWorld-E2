## 1. Coordinacion de Cambios CI/CD

- [x] 1.1 Revisar `cicd-00-initial-pipeline` y decidir si se archiva, se deja supersedido o se reconcilia antes de aplicar este cambio.
- [x] 1.2 Confirmar que ningun otro cambio activo modificara simultaneamente `.github/workflows/ci.yml`.

## 2. PostgreSQL en Docker Compose

- [x] 2.1 Agregar un servicio PostgreSQL 16 a `opsx/docker-compose.yml`.
- [x] 2.2 Declarar un volumen persistente para datos PostgreSQL.
- [x] 2.3 Configurar credenciales PostgreSQL y una URL de conexion consumible por backend.
- [x] 2.4 Agregar healthcheck verificable para PostgreSQL.
- [x] 2.5 Configurar backend para depender de PostgreSQL saludable.

## 3. Backend Python en CI

- [x] 3.1 Reemplazar la deteccion backend basada en `backend/package.json` por preparacion Python/FastAPI.
- [x] 3.2 Instalar dependencias desde `backend/requirements.txt` cuando exista.
- [x] 3.3 Informar explicitamente cuando `backend/requirements.txt` aun no exista.
- [x] 3.4 Levantar PostgreSQL en CI y esperar a que este saludable antes de pruebas backend.
- [x] 3.5 Exponer al backend de CI la URL de conexion PostgreSQL esperada.

## 4. Migraciones y Pruebas Backend

- [x] 4.1 Agregar un paso explicito para aplicar migraciones backend cuando el backend declare el mecanismo del proyecto.
- [x] 4.2 Informar explicitamente cuando no exista un mecanismo de migracion backend.
- [x] 4.3 Ejecutar `pytest` para backend Python cuando exista la superficie de pruebas.
- [x] 4.4 Ejecutar cobertura con `pytest-cov`.
- [x] 4.5 Hacer fallar el workflow cuando pytest falle o la cobertura backend sea inferior a 80%.

## 5. Validacion Docker y Workflow

- [x] 5.1 Mantener la validacion de configuracion Docker Compose antes del build.
- [x] 5.2 Mantener el build de servicios Docker definidos por Compose.
- [x] 5.3 Ejecutar validacion local de Compose para `opsx/docker-compose.yml`.
- [x] 5.4 Validar el cambio OpenSpec.
- [x] 5.5 Confirmar que el workflow final satisface el contrato Python/FastAPI + PostgreSQL antes de aplicar E1-H01.
