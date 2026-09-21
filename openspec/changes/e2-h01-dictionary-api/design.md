## Context

El backend ya aplica el patrón `api -> services -> repositories -> models` para fuentes y configuración, usa FastAPI, Pydantic, SQLAlchemy 2.0, Alembic y PostgreSQL 16, y convierte errores de validación a `400`. MOD-01 define la entidad `TERMINO`, pero todavía no existe persistencia ni API de diccionario. Véase `proposal.md` para la motivación y `specs/dictionary-management/spec.md` para el comportamiento observable.

## Goals / Non-Goals

**Goals:**

- Incorporar una vertical API–PostgreSQL completa y coherente con la arquitectura vigente.
- Mantener normalización y reglas de negocio fuera del router.
- Proteger la unicidad normalizada y la atomicidad ante conflictos.
- Permitir que ADR-001 añada después semántica al valor sin bloquear el CRUD.

**Non-Goals:**

- Fijar el rango, precisión semántica o fórmula del valor de sentimiento.
- Crear `NOTICIA_TERMINO` o analizar noticias.
- Añadir seeds, importación masiva, paginación o filtros adicionales al parámetro `q`.
- Implementar la interfaz E2-H01-UI o autenticación.

## Decisions

### 1. Nueva vertical `dictionary`

Se añadirá una migración posterior a la revisión vigente, un modelo `Term`, un repositorio, un servicio, schemas de entrada/salida y un router con prefijo `/dictionary`. El router dependerá del servicio; el servicio concentrará normalización, validación y errores; el repositorio encapsulará SQLAlchemy y las transacciones.

Se reutilizarán los dominios de idioma existentes y el manejo global de `400`, `404` y `500`. La alternativa de implementar consultas directamente en el router se descarta porque contradice ADR-000 y dificulta las pruebas unitarias.

### 2. Esquema físico mínimo de `termino`

La tabla contendrá `id_termino`, `palabra` de hasta 100 caracteres, `idioma`, `valor` numérico, `activo`, `fecha_alta` y `fecha_modificacion`. Una restricción única cubrirá `(palabra, idioma)` y un `CHECK` limitará el idioma a `es` o `en`.

`valor` se almacenará como `NUMERIC` sin `CHECK` de rango ni precisión semántica. En la frontera API se usará un decimal finito para evitar pérdidas propias de `float`. La alternativa de adoptar provisionalmente `-10..10` se descarta porque esa decisión corresponde a ADR-001 y no forma parte del criterio de aceptación de E2-H01-API.

### 3. Normalización antes de consultar unicidad

El servicio aplicará recorte de espacios exteriores y conversión a minúsculas antes de crear o modificar. No eliminará tildes, no lematizará y no alterará caracteres interiores. La base almacenará solo la forma normalizada, de modo que su restricción única proteja también frente a carreras entre solicitudes.

Los conflictos de unicidad detectados en el servicio o por PostgreSQL se traducirán a `400` y la transacción se revertirá. La alternativa de conservar la forma original en otra columna se descarta porque no está exigida por el alcance mínimo.

### 4. Búsqueda simple y determinista

`GET /dictionary` reutilizará el listado completo cuando `q` no esté presente y aplicará coincidencia parcial insensible a mayúsculas cuando exista. Los caracteres comodín del gestor se tratarán como texto del usuario. La comparación conservará tildes y la respuesta se ordenará por palabra, idioma e identificador.

No se incorpora paginación en este alcance porque el criterio mínimo exige lista y búsqueda, y no existe todavía un volumen o contrato que determine límites. Si la carga real lo requiere, se añadirá como una ampliación compatible.

### 5. DELETE como desactivación lógica

DELETE cambiará `activo` a falso y actualizará `fecha_modificacion`; no eliminará la fila. Esto respeta la intención de MOD-01 de preservar futuras relaciones históricas con `NOTICIA_TERMINO`. Repetir DELETE sobre un término inactivo devolverá `204`, manteniendo la operación idempotente; un identificador inexistente devolverá `404`.

La eliminación física se descarta porque produciría una incompatibilidad cuando E2-H02 materialice las apariciones históricas.

### 6. Fechas y transacciones

PostgreSQL asignará `fecha_alta` y `fecha_modificacion` al crear. El servicio actualizará `fecha_modificacion` en PUT, PATCH y en la primera desactivación. Cada escritura terminará en una única confirmación o rollback y devolverá la representación refrescada cuando corresponda.

## Risks / Trade-offs

- **[ADR-001 adopta un rango que excluye datos existentes]** → El cambio de ADR-001 deberá incluir validación nueva y una estrategia explícita para migrar, desactivar o rechazar términos previos; E2-H01 no inventará ese criterio.
- **[Listado sin paginación crece demasiado]** → Mantener el repositorio preparado para añadir límites compatibles cuando exista una necesidad medible.
- **[Búsqueda dependiente de collation para tildes]** → Probar explícitamente mayúsculas y tildes contra PostgreSQL y documentar que las tildes son significativas.
- **[Carreras al crear duplicados]** → Conservar la restricción única en base de datos y traducir la violación a error de dominio con rollback.

## Migration Plan

1. Aplicar la nueva revisión Alembic para crear `termino` sin modificar tablas existentes.
2. Desplegar el backend con el router y ejecutar las pruebas API–PostgreSQL.
3. Validar Swagger y el CRUD en Docker sobre una base migrada desde `head` anterior.
4. Para rollback, retirar primero el uso del endpoint y ejecutar el downgrade que elimina únicamente `termino`; no existen datos previos que transformar en esta primera versión.
