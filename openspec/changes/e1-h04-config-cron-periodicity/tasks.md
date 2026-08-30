## 1. Modelo y migracion

- [x] 1.1 Crear el modelo SQLAlchemy de `configuracion` con `clave`, `valor`, `tipo`, `descripcion` y `fecha_modificacion`; verificar que respeta MOD-01 y que queda importado por la metadata de Alembic.
- [x] 1.2 Agregar una migracion Alembic que cree la tabla `configuracion`; verificar `alembic upgrade head` y downgrade sobre PostgreSQL de prueba.

## 2. Servicio y persistencia

- [x] 2.1 Crear repositorio de configuracion para obtener y guardar parametros por clave usando una sesion SQLAlchemy sin exponer consultas desde el servicio.
- [x] 2.2 Crear servicio de configuracion que resuelva `captura.periodicidad_minutos` con default `60`, valide enteros positivos y persista actualizaciones sin duplicar claves.
- [x] 2.3 Agregar pruebas unitarias del servicio para lectura por defecto, lectura persistida, actualizacion valida, reemplazo y rechazo de valores invalidos sin modificar el estado previo.

## 3. API y contrato

- [x] 3.1 Agregar schemas Pydantic para request/response de `/config`, usando `captura_periodicidad_minutos` como campo publico.
- [x] 3.2 Agregar router `GET`/`PUT /api/v1/config`, conectarlo en `app.main` bajo `/api/v1` y mapear errores de validacion a `400`.
- [x] 3.3 Verificar que Swagger/OpenAPI publica ambos endpoints con respuestas JSON y sin `422`.

## 4. Integracion y documentacion

- [x] 4.1 Agregar pruebas de integracion API contra PostgreSQL migrado para `GET` sobre base limpia, `PUT` valido, segundo `GET` persistido y `PUT` invalido.
- [x] 4.2 Actualizar documentacion del backend con el valor por defecto, ejemplos de `GET`/`PUT /config` y comandos de verificacion.
- [ ] 4.3 Ejecutar la suite completa, validacion OpenSpec estricta y build/configuracion Docker Compose; registrar evidencia en el PR de E1-H04 antes de marcar la historia como terminada.
