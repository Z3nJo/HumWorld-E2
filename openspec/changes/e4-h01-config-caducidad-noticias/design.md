## Context

E1-H04 implemento la base de configuracion runtime con FastAPI, Pydantic, SQLAlchemy y PostgreSQL. El endpoint `/api/v1/config` actualmente expone `captura_periodicidad_minutos`, y la tabla `configuracion` ya permite guardar parametros globales como clave-valor. MOD-01 define el parametro `noticias.caducidad_dias` con tipo `entero` y valor por defecto `30`.

E4-H01 bloquea a E4-H02, E4-H03 y E4-H04 porque esas historias necesitan conocer durante cuantos dias se conservan las noticias. Esta feature solo deja disponible el parametro; el borrado de datos y la UI quedan para tareas posteriores.

## Goals / Non-Goals

**Goals:**

- Devolver `noticias_caducidad_dias` desde `GET /api/v1/config`.
- Persistir `noticias.caducidad_dias` desde `PUT /api/v1/config`.
- Mantener `captura_periodicidad_minutos` en el contrato para no romper E1-H03.
- Usar default `30` dias cuando la clave aun no existe.
- Validar que la caducidad sea un entero positivo.
- Reutilizar la tabla `configuracion` y el flujo `api -> services -> repositories -> models`.

**Non-Goals:**

- Purgar noticias antiguas.
- Crear endpoint dedicado como `/config/caducidad`.
- Cambiar el esquema de `configuracion`.
- Crear UI administrativa o integracion frontend.

## Decisions

### Extension del contrato tipado

El contrato de `/config` se extendera agregando `noticias_caducidad_dias` al mismo objeto JSON:

```json
{
  "captura_periodicidad_minutos": 60,
  "noticias_caducidad_dias": 30
}
```

Esto conserva la API introducida por E1-H04 y evita que los consumidores tengan que manejar claves internas como `noticias.caducidad_dias`.

Alternativa descartada: devolver una lista generica de parametros. Aunque seria mas cercana a la tabla clave-valor, haria menos claro el contrato para E4-H02 y E4-H04.

### PUT como reemplazo de configuracion runtime completa

`PUT /api/v1/config` aceptara ambos campos tipados. Como el endpoint usa semantica `PUT`, el request debera incluir tanto `captura_periodicidad_minutos` como `noticias_caducidad_dias`. Esto evita una actualizacion parcial ambigua y mantiene una unica representacion completa de configuracion runtime.

Alternativa descartada: aceptar solo `noticias_caducidad_dias` en E4-H01. Eso se pareceria mas a `PATCH` y podria romper la semantica ya documentada como reemplazo.

### Sin migracion nueva

No se agregara migracion de esquema. La clave `noticias.caducidad_dias` se creara o actualizara usando la tabla `configuracion` existente. Su tipo sera `entero`, su valor se serializara como texto y su descripcion quedara guardada junto al parametro.

### Validacion

La caducidad debe ser un entero positivo con minimo `1` dia. No se fija maximo en E4-H01 porque el backlog solo exige persistir y recuperar el valor; si E4-H02 necesita limites operativos para el purgado, debera justificarlo en su propia propuesta.

## Interaction With Later Tasks

- E4-H02 podra leer `noticias_caducidad_dias` para calcular el umbral de purgado.
- E4-H03 podra usar el mismo valor para cualquier flujo posterior relacionado con purgado o auditoria.
- E4-H04 podra mostrar y editar ambos parametros desde una UI de administracion sobre `/config`.
- E1-H03 mantiene acceso a `captura_periodicidad_minutos` sin cambios de ruta.

## Risks / Trade-offs

- [Consumidores existentes de `PUT /config` podrian enviar solo periodicidad] -> E1-H04 aun no tenia consumidores frontend; documentar que `PUT` reemplaza la configuracion completa.
- [El purgado podria necesitar aceptar `0` como "sin caducidad"] -> No se adopta en E4-H01; el criterio minimo y MOD-01 describen una caducidad en dias, por lo que `1` es el minimo operativo.
- [Una configuracion corrupta en BD podria impedir leer `/config`] -> Mantener errores claros de validacion del servicio y cubrirlo con pruebas unitarias.

## Migration Plan

1. Reutilizar la tabla `configuracion` creada por E1-H04.
2. Extender servicio y schemas para incluir `noticias_caducidad_dias`.
3. Verificar `GET /api/v1/config` sobre base limpia: devuelve periodicidad `60` y caducidad `30`.
4. Verificar `PUT /api/v1/config` con ambos campos validos y confirmar persistencia con un segundo `GET`.
5. Verificar rechazo de caducidad invalida sin modificar valores previos.

Rollback: revertir cambios de codigo y documentacion. No hay migracion de esquema que revertir; si se quiere limpiar el dato, eliminar solo la clave `noticias.caducidad_dias`.
