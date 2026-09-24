## Context

El catálogo actual se declara en `backend/app/seeds/sources.py` y el seed existente es idempotente para nombres y URLs, pero no interpreta que una URL antigua haya sido reemplazada. Por ello, cambiar solo la constante CBC produciría un nuevo registro y dejaría el legado en la base. La motivación y la evidencia de selección de PBS están en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Mantener una sola fuente activa para América con los valores PBS definidos.
- Reconciliar instalaciones que ya fueron inicializadas con CBC sin perder referencias de datos.
- Preservar atomicidad, idempotencia y las comprobaciones de conflicto del seed.
- Cubrir base limpia, transición, reejecución y rollback con pruebas reproducibles.

**Non-Goals:**

- Cambiar el cliente HTTP, añadir reintentos, cabeceras especiales o lógica de fallback.
- Descargar feeds remotos durante el seed o hacer depender CI de la red pública.
- Introducir un endpoint nuevo, alterar el modelo de noticias o modificar otras regiones.

## Decisions

1. **PBS como fuente canónica de América.** Se elige el feed oficial de PBS NewsHour porque la prueba con el cliente actual obtuvo HTTP 200, RSS válido, 20 entradas utilizables y cabeceras de caché, además de funcionar dentro de la imagen Docker. NPR quedó como alternativa con menos entradas; los feeds VOA devolvieron 403 sin cambios de cliente.

2. **Reconciliación en el seed preservando IDs.** La rutina debe reconocer la URL CBC como alias legado y actualizar en sitio la fila de fuente/canal hacia PBS dentro de la misma transacción. Esto evita romper claves foráneas de noticias y evita que el cambio dependa de una migración de datos ejecutada por separado. Si PBS ya existe, se valida que sea compatible y se trata cualquier duplicidad como conflicto explícito.

3. **Catálogo declarativo y dominio existente.** Se conserva el esquema actual de `SOURCE_SEEDS`, los enums de continente/categoría/idioma y las restricciones de unicidad. La fuente PBS se modela con idioma de dominio `en`, aunque el feed anuncie `en-US`.

4. **Pruebas sin red en CI; evidencia viva separada.** Las pruebas verifican los metadatos y la transición usando PostgreSQL local/contenido determinista. La disponibilidad externa se valida manualmente con el cliente dentro de Docker y se registra como evidencia, sin convertirla en una dependencia de CI.

## Risks / Trade-offs

- **[Registros duplicados previos]** → Detectar CBC y PBS antes de modificar; abortar y hacer rollback si sus relaciones o restricciones impiden una reconciliación segura.
- **[Noticias existentes referencian la fuente CBC]** → Actualizar la fila conservando `id_fuente` (o usar una operación equivalente que preserve la clave) y comprobarlo en integración.
- **[PBS cambia o deja de publicar]** → Mantener la validación operativa documentada y dejar la sustitución de fuente como un cambio posterior, sin acoplarla al proceso de seed.

## Migration Plan

1. Desplegar el cambio de seed y sus pruebas.
2. Ejecutar el seed contra una base de respaldo y verificar que CBC se reconcilia a PBS, que las noticias mantienen sus claves y que no aparecen duplicados.
3. Ejecutar la validación manual del feed PBS en Docker.
4. Si surge un conflicto, detener el despliegue: la transacción debe revertirse; resolver los datos incompatibles y reintentar. El rollback lógico consiste en restaurar el catálogo CBC y reejecutar el seed anterior sobre una copia respaldada.
