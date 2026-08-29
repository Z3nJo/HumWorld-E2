## Why

HumWorld necesita una carga inicial reproducible que deje PostgreSQL listo para las tareas de captura posteriores. E1-H01 ya proporciona el modelo persistente de canales y fuentes RSS, por lo que E1-H02 puede completar el inventario minimo exigido para Sprint 1 sin ampliar el contrato REST.

## What Changes

- Incorporar un seed versionado con seis canales y seis fuentes RSS, una por cada continente admitido por el dominio.
- Proporcionar un comando explicito que se ejecute despues de `alembic upgrade head` sobre PostgreSQL limpio.
- Hacer la carga idempotente para que una segunda ejecucion conserve los mismos registros sin duplicarlos.
- Ejecutar el lote atomicamente y fallar de forma clara ante datos existentes incompatibles.
- Verificar mediante una prueba de integracion que una base limpia queda cubierta por los seis continentes y que la reejecucion no altera las cantidades.
- Documentar el comando y el resultado esperado.
- Mantener fuera de alcance la descarga o validacion remota de feeds, la captura de noticias, nuevos endpoints, cambios en Swagger, nuevas columnas y migraciones de esquema.

## Capabilities

### New Capabilities

- `rss-source-seeding`: Carga inicial versionada, atomica e idempotente de una fuente RSS activa por cada continente sobre PostgreSQL migrado.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: nuevo modulo ejecutable de seed y catalogo minimo versionado dentro de la capa de datos.
- Persistencia: inserciones en las tablas existentes `canal` y `fuente_rss`; no cambia el esquema ni se agrega una migracion Alembic.
- Pruebas: nueva cobertura de integracion contra PostgreSQL limpio y migrado.
- Documentacion: instrucciones de ejecucion y verificacion del seed.
- API: sin cambios en `/api/v1/sources`, OpenAPI o Swagger.
