## Why

E1-H01 encabeza la cadena critica del Sprint 1: la carga inicial, la captura automatica, la captura manual y el panel de administracion necesitan canales y fuentes RSS persistentes. El backend actual solo expone el esqueleto de FastAPI, por lo que se requiere la primera vertical funcional con el alcance minimo exigido por el Backlog Final, el PDF del proyecto, ADR-000, ADR-003, MOD-01 y la Definition of Done.

## What Changes

- Incorporar la gestion persistente de canales y fuentes RSS mediante el CRUD obligatorio `/api/v1/sources`.
- Permitir crear un canal con nombre y continente y asociarle atomicamente una o mas fuentes RSS, o agregar fuentes a un canal existente.
- Validar los dominios de continente, categoria IPTC de primer nivel e idioma (`es` o `en`), junto con la unicidad del nombre del canal y de la URL del feed.
- Exponer listado, detalle y filtros minimos por continente y estado activo, ademas de reemplazo, actualizacion parcial y eliminacion de fuentes.
- Mantener fija la asociacion de una fuente a su canal durante `PUT` y `PATCH`; mover fuentes entre canales queda fuera de E1-H01.
- Persistir `Canal` y `FuenteRSS` mediante SQLAlchemy 2.0 y una migracion Alembic compatible con PostgreSQL 16.
- Publicar el contrato desde FastAPI en `/api/docs`, incorporar pruebas unitarias y API-BD, y exigir cobertura minima del 80 % sobre el codigo nuevo.
- Mantener `openspec/` como fuente operativa de la CLI y publicar de forma sincronizada los contratos entregables bajo `opsx/contracts/`, sin mantener dos copias editables.
- No incluye `/channels`, CRUD independiente de canales, interfaz web, seed, lectura de feeds, noticias, cron, configuracion general ni autenticacion.

## Capabilities

### New Capabilities

- `rss-source-management`: Alta minima de canales y CRUD obligatorio de fuentes RSS asociadas, con filtros, categorizacion IPTC, persistencia y contrato REST documentado.

### Modified Capabilities

Ninguna.

## Impact

- **Backend:** estructura minima `api/`, `services/`, `repositories/` y `models/`, configuracion de base de datos y pruebas.
- **API:** endpoints obligatorios bajo `/api/v1/sources`, publicados automaticamente en `/api/docs` mediante FastAPI y Pydantic.
- **Datos:** tablas `canal` y `fuente_rss`, restricciones e indices definidos por MOD-01 y una migracion Alembic.
- **Dependencias:** SQLAlchemy 2.0, Alembic, driver PostgreSQL, pytest y medicion de cobertura.
- **Entorno e integracion:** E1-H01 consumira la base transversal ya entregada por `INFRA-02` y `CICD-00`: PostgreSQL 16 en Docker Compose y ejecucion de pytest contra PostgreSQL en CI, ambas verificadas antes de iniciar la implementacion.
- **Documentacion:** instrucciones del backend, contrato Swagger y copia entregable sincronizada de OpenSpec en `opsx/contracts/`.
