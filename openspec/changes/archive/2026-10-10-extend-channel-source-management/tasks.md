## 1. Contratos y validacion de datos

- [x] 1.1 Ampliar los esquemas de creacion y respuesta de fuentes con los campos completos de canal y las fechas de solo lectura de fuente; verificar serializacion, defaults y rechazo de fechas de escritura con pruebas de esquemas y API.
- [x] 1.2 Incorporar esquemas de reemplazo, actualizacion parcial y respuesta de canales, distinguiendo campos ausentes de opcionales enviados como `null`; verificar `PUT` completo, `PATCH` vacio, limpieza de opcionales y rechazo de nulos obligatorios mediante pruebas unitarias.
- [x] 1.3 Implementar una normalizacion reutilizable de pais y la validacion HTTP/HTTPS de `url_sitio`; verificar mayusculas, espacios exteriores, longitudes invalidas, caracteres no ASCII y protocolos no admitidos mediante pruebas parametrizadas.

## 2. Capas de administracion de canales

- [x] 2.1 Implementar el repositorio de canales con consulta por identificador y nombre, listado ordenado con filtros acumulativos y actualizacion transaccional; verificar joins, filtros y traduccion de duplicados con pruebas contra dobles y PostgreSQL.
- [x] 2.2 Implementar el servicio de canales para listar, consultar, reemplazar, actualizar parcialmente y desactivar logicamente de forma idempotente; verificar unicidad, `404`, conservacion de identificador y fecha, y ausencia de cambios en fuentes hijas con pruebas unitarias.
- [x] 2.3 Crear y registrar el router `/api/v1/channels` con `GET` de coleccion y detalle, `PUT`, `PATCH` y `DELETE`; verificar respuestas `200`, `204`, `400`, `404`, cuerpo vacio al eliminar y acceso sin autenticacion mediante pruebas de API.

## 3. Adaptacion compatible de fuentes

- [x] 3.1 Extender el flujo de `POST /api/v1/sources` para persistir `pais`, `url_sitio` y `activo` del canal sin alterar la atomicidad existente; verificar alta minima, alta completa, defaults y rollback de lotes invalidos con pruebas unitarias y PostgreSQL.
- [x] 3.2 Completar las respuestas de alta, listado, detalle y actualizacion de fuentes con el canal completo, `fecha_alta` y `fecha_ultima_captura`; verificar que las rutas existentes conservan sus campos y codigos previos mediante pruebas de regresion.
- [x] 3.3 Agregar `channel_id` y `country` al listado de fuentes, combinandolos con `continent` y `active`; verificar normalizacion, interseccion de filtros, orden determinista y lista vacia para canales sin coincidencias mediante pruebas de repositorio y API-BD.

## 4. Estado del canal en la captura

- [x] 4.1 Ajustar el recorrido completo de captura para seleccionar solo fuentes activas asociadas a canales activos y cargar el canal sin consultas por fila; verificar las cuatro combinaciones de estados mediante pruebas unitarias y de repositorio PostgreSQL.
- [x] 4.2 Ajustar la captura manual por `source_ids` para diferenciar fuentes inexistentes de fuentes no elegibles por su estado o el de su canal; verificar `404` atomico para inexistentes y `skipped_source_ids` para ambos tipos de inactividad.
- [x] 4.3 Verificar que desactivar y reactivar un canal no modifica `RssSource.activa` y que la elegibilidad posterior respeta el estado individual conservado mediante una prueba integrada de administracion y captura.

## 5. Contrato, integracion y documentacion

- [x] 5.1 Ampliar las pruebas OpenAPI para comprobar todas las operaciones de `/channels`, los nuevos filtros y campos de `/sources`, los errores documentados y la ausencia de respuestas `422`; verificar el contrato generado completo.
- [x] 5.2 Ejecutar las pruebas unitarias e integracion PostgreSQL afectadas y la suite completa del backend; verificar que no haya regresiones y que la cobertura del codigo nuevo cumpla el umbral vigente del proyecto.
- [x] 5.3 Actualizar la documentacion de uso del backend con ejemplos de alta completa, filtros, edicion, desactivacion y reactivacion de canales, incluyendo el efecto geografico sobre el historial; verificar que los comandos y cuerpos coincidan con Swagger.
- [x] 5.4 Validar `extend-channel-source-management` con OpenSpec en modo estricto y revisar el diff final para confirmar que no incluye migraciones, cambios de seed, frontend ni dashboard.
