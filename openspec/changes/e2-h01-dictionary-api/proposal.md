## Why

HumWorld necesita administrar por API el diccionario bilingüe que consumirán el análisis de sentimiento y las funcionalidades posteriores del Sprint 2. Con MOD-01 aceptado y la decisión D-09 de implementar primero la API, E2-H01-API puede entregar el CRUD y la búsqueda sin anticipar el rango o la fórmula que resolverá ADR-001.

## What Changes

- Incorporar persistencia PostgreSQL para términos con palabra normalizada, idioma, valor decimal, estado activo y fechas de auditoría.
- Exponer bajo `/api/v1/dictionary` listado, búsqueda por texto, detalle, creación, reemplazo, actualización parcial y eliminación lógica.
- Garantizar unicidad por palabra normalizada e idioma, con soporte exclusivo para español e inglés.
- Publicar el contrato en Swagger/OpenAPI y usar los códigos estándar `200`, `201`, `204`, `400`, `404` y `500`.
- Añadir pruebas unitarias e integración API–PostgreSQL para las operaciones, validaciones, búsqueda, conflictos y persistencia.
- Posponer explícitamente para ADR-001 y E2-H02 el rango semántico de `valor`, la fórmula de sentimiento y la persistencia de `NOTICIA_TERMINO`.

## Capabilities

### New Capabilities

- `dictionary-management`: administración REST y persistente de términos evaluables bilingües, incluyendo listado, búsqueda, detalle, creación, actualización y desactivación.

### Modified Capabilities

Ninguna.

## Impact

- Nueva migración Alembic y modelo SQLAlchemy para `termino`.
- Nuevos repositorio, servicio, schemas Pydantic y router de diccionario siguiendo `api -> services -> repositories -> models`.
- Registro del router en la aplicación y ampliación de pruebas OpenAPI e integración PostgreSQL.
- Documentación de backend y evidencia funcional de E2-H01-API.
- Sin cambios en captura RSS, fuentes, configuración, frontend, motor de sentimiento ni dashboards.
