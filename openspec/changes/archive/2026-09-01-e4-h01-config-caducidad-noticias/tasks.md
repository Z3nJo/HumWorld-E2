## 1. Contrato y alcance

- [x] 1.1 Confirmar que E4-H01 extiende `runtime-configuration` y no crea endpoints, tablas ni migraciones nuevas; verificar que la propuesta mantiene compatibilidad con E1-H04.
- [x] 1.2 Actualizar la representacion publica de `/config` para incluir `noticias_caducidad_dias` junto a `captura_periodicidad_minutos`.

## 2. Servicio y persistencia

- [x] 2.1 Extender el servicio de configuracion con la clave `noticias.caducidad_dias`, tipo `entero`, descripcion legible y default `30`.
- [x] 2.2 Actualizar la lectura de configuracion para resolver ambos parametros desde la tabla `configuracion`, usando defaults cuando falten.
- [x] 2.3 Actualizar la escritura de configuracion para persistir ambos parametros en una sola operacion logica, sin duplicar claves y sin perder la periodicidad existente.
- [x] 2.4 Agregar pruebas unitarias para default, lectura persistida, actualizacion valida, reemplazo e invalidos de caducidad sin modificar valores previos.

## 3. API y OpenAPI

- [x] 3.1 Extender schemas Pydantic de `/config` con `noticias_caducidad_dias` como entero estricto positivo.
- [x] 3.2 Verificar `GET /api/v1/config` y `PUT /api/v1/config` con ambos campos, manteniendo respuestas `400` para validaciones y sin `422` en OpenAPI.

## 4. Integracion y documentacion

- [x] 4.1 Actualizar pruebas de integracion PostgreSQL para `GET` en base limpia, `PUT` valido, segundo `GET` persistido, reemplazo e invalidos de caducidad.
- [x] 4.2 Actualizar `backend/README.md`, evidencia del sprint y contratos OpenSpec sincronizados.
- [x] 4.3 Ejecutar suite completa, validacion OpenSpec estricta y build/configuracion Docker Compose; registrar evidencia en el PR de E4-H01 antes de marcar la historia como terminada.
