## Context

El backend actual usa FastAPI, SQLAlchemy 2.0 sincronico, Alembic y PostgreSQL 16. La arquitectura vigente mantiene la frontera `api -> services -> repositories -> models`, con errores de validacion convertidos en respuestas HTTP desde `app.main`. E1-H01 ya dejo el patron de CRUD REST, schemas Pydantic, repositorios y pruebas de integracion. MOD-01 define `CONFIGURACION` como clave-valor y declara `captura.periodicidad_minutos` con tipo entero y valor por defecto `60`.

E1-H04 bloquea a E1-H03 porque la captura automatica debe poder leer su periodicidad. Sin embargo, E1-H04 no necesita ejecutar ni programar el cron; solo debe dejar persistido y recuperable el parametro.

## Goals / Non-Goals

**Goals:**

- Exponer `GET /api/v1/config` para recuperar la configuracion runtime minima.
- Exponer `PUT /api/v1/config` para actualizar `captura.periodicidad_minutos`.
- Persistir el parametro en PostgreSQL con una tabla extensible de clave-valor.
- Aplicar un valor por defecto documentado de `60` minutos cuando el registro aun no exista.
- Validar tipo y rango en la capa de servicio.
- Mantener Swagger/OpenAPI generado desde FastAPI como contrato publico.

**Non-Goals:**

- Implementar scheduler, jobs, captura RSS o reconfiguracion en caliente del cron.
- Introducir `noticias.caducidad_dias` antes de E4-H01.
- Crear endpoints por parametro, UI administrativa o formularios frontend.
- Cambiar el modelo de fuentes RSS ni el seed E1-H02.

## Decisions

### Tabla clave-valor extensible

Se confirma para esta feature la decision abierta de MOD-01: `CONFIGURACION` se implementara como una tabla clave-valor con columnas `clave`, `valor`, `tipo`, `descripcion` y `fecha_modificacion`.

Esto permite que E4-H01 agregue `noticias.caducidad_dias` como nuevo parametro sin cambiar la forma general del modelo ni crear una tabla distinta. La validacion de tipos y rangos vive en el servicio, alineada con ADR-000.

Alternativa descartada: una tabla de una sola fila con columna `captura_periodicidad_minutos`. Es mas simple para E1-H04 aislada, pero fuerza una migracion de esquema por cada parametro futuro y contradice la propuesta explicita de MOD-01.

### Contrato agregado de `/config`

`GET /api/v1/config` devolvera una representacion agregada de configuracion, empezando con:

```json
{
  "captura_periodicidad_minutos": 60
}
```

`PUT /api/v1/config` aceptara la misma forma para reemplazar el valor editable de E1-H04:

```json
{
  "captura_periodicidad_minutos": 30
}
```

La clave persistida seguira siendo `captura.periodicidad_minutos`; el nombre JSON usa snake_case para mantener consistencia con los schemas actuales de la API.

Alternativa descartada: exponer directamente un arreglo generico de pares clave-valor. Aunque se parece mas a la tabla, obligaria al frontend y a E1-H03 a conocer claves internas y tipos serializados. El endpoint puede mantenerse estable y agregar campos tipados cuando existan nuevos parametros.

### Inicializacion perezosa del valor por defecto

El servicio resolvera `captura.periodicidad_minutos` con default `60`. Si el registro no existe, podra crearlo al leer o al actualizar, siempre dentro de una transaccion normal del repositorio. Esto evita necesitar un seed separado para un unico parametro y permite que una base migrada limpia cumpla el criterio de `GET /config`.

Alternativa descartada: insertar el valor por defecto desde la migracion. Acopla datos de configuracion operativa a una migracion de esquema; para este proyecto es aceptable, pero menos flexible que resolver defaults en la capa de servicio.

### Validacion del parametro

La periodicidad debe ser un entero positivo. El minimo concreto sera `1` minuto. No se define maximo en E1-H04 porque el backlog solo exige persistir y recuperar el valor configurable, y el cron real de E1-H03 podra decidir limites operativos adicionales si aparecen.

### Manejo de errores

Entradas invalidas responderan `400` siguiendo la politica actual que elimina `422` del OpenAPI. Errores inesperados seguiran pasando por el handler global `500`.

## Interaction With Later Tasks

- E1-H03 podra leer `captura_periodicidad_minutos` desde `GET /config` o desde el servicio de configuracion, sin que E1-H04 programe jobs.
- E4-H01 agregara el parametro `noticias.caducidad_dias` sobre la misma tabla, sin migracion estructural obligatoria si solo suma una nueva clave.
- E4-H04 podra construir el panel de administracion consumiendo `/config`; si necesita metadatos como descripciones o tipos en la UI, esa ampliacion debe proponerse en su propia tarea.

## Risks / Trade-offs

- [El contrato tipado puede requerir ampliacion para E4-H04] -> Mantener E1-H04 minimo y dejar la exposicion de metadatos como decision de UI futura.
- [La inicializacion perezosa escribe durante un GET] -> Documentar la decision y probarla; si el equipo prefiere GET estrictamente read-only, aplicar el default solo en memoria y crear el registro en PUT.
- [El cron real podria necesitar recarga en caliente] -> Fuera de alcance de E1-H04; E1-H03 debe decidir como consumir el valor.

## Migration Plan

1. Agregar migracion Alembic para crear `configuracion`.
2. Aplicar `alembic upgrade head` sobre PostgreSQL.
3. Verificar `GET /api/v1/config` sobre base limpia y confirmar `60`.
4. Ejecutar `PUT /api/v1/config` con un valor valido y confirmar persistencia con un segundo `GET`.
5. Validar rechazo de valores invalidos.

Rollback: revertir la migracion de `configuracion`. Si ya existen parametros de tareas posteriores, coordinar antes de aplicar downgrade para no perder configuracion compartida.
