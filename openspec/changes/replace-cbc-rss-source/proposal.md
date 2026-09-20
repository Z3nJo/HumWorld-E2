## Why

El cierre del Sprint 1 documenta que el feed CBC configurado para América falla de forma persistente, dejando esa cobertura sin una fuente RSS operativa. La validación comparativa identificó PBS NewsHour Headlines como reemplazo oficial y compatible con el cliente actual: responde HTTP 200, entrega RSS válido con entradas utilizables y funciona dentro de Docker.

## What Changes

- Reemplazar en el catálogo de seeds la fuente CBC por PBS NewsHour Headlines (`https://www.pbs.org/newshour/feeds/rss/headlines`) para el continente América.
- Mantener la clasificación IPTC `society`, idioma `en` y estado activo de la fuente reemplazante.
- Reconciliar de forma segura instalaciones existentes que ya contienen CBC, evitando duplicados y preservando las referencias persistentes de canal, fuente y noticias cuando sea posible.
- Garantizar que el seed siga siendo idempotente, transaccional y protegido frente a conflictos de URL o nombre.
- Añadir pruebas para base limpia, migración del registro CBC existente, reejecución idempotente y rollback ante conflictos.
- Registrar la validación manual del feed PBS en el entorno Docker; no introducir descargas de feeds externos en la suite CI.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `rss-source-management`: el catálogo persistente de fuentes RSS debe mantener una fuente activa y operativa para América, incluyendo la reconciliación del registro CBC legado con PBS sin duplicar fuentes ni romper la persistencia.

## Impact

- `backend/app/seeds/sources.py` y la lógica de seed/reconciliación asociada.
- Pruebas unitarias y de integración PostgreSQL del seed.
- Datos persistidos de los registros de canal/fuente América en entornos ya inicializados.
- Documentación y evidencia de validación del feed; no se modifican el cliente HTTP, los endpoints REST ni el contrato de captura RSS.
