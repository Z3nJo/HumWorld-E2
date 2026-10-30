## 1. Inventario y configuración privada local

- [x] 1.1 Revisar las dos ubicaciones de `secrets:S6698` y los ejemplos activos del mismo recorrido; registrar archivos afectados sin copiar credenciales a nueva documentación ni fixtures.
- [x] 1.2 Sustituir los respaldos sensibles de `opsx/docker-compose.yml` por variables obligatorias para contraseña y URL, manteniendo las variables no sensibles y el volumen existente; comprobar fallo ante ausencia y valores vacíos.
- [x] 1.3 Crear o actualizar la plantilla raíz `.env.example` con valores sensibles vacíos e instrucciones de generación privada y coherencia de URL; verificar con `git check-ignore` que el archivo local se excluye y la plantilla es versionable.
- [x] 1.4 Actualizar README raíz/backend y los ejemplos de conexión afectados para usar `--env-file .env`, explicar la codificación de caracteres reservados y evitar contraseñas utilizables en contenido versionado.

## 2. Credenciales de CI y protección de logs

- [x] 2.1 Sustituir las credenciales literales del servicio PostgreSQL de CI por el secreto `CI_POSTGRES_PASSWORD`; documentar su provisión en GitHub y comprobar que su ausencia produce un diagnóstico explícito sin omitir pruebas.
- [x] 2.2 Construir de forma segura la URL de pruebas del runner desde el secreto, enmascarando contraseña y representaciones derivadas antes de usarlas; conservar migraciones y pruebas autenticadas.
- [x] 2.3 Proporcionar variables coherentes para validación/build de Compose, diferenciando host `postgres` de `localhost`; cambiar a validación silenciosa `config --quiet` y revisar que ningún paso publique credenciales resueltas.
- [x] 2.4 Verificar el flujo con una contraseña temporal que contenga caracteres reservados y el comportamiento cuando los secretos no están disponibles, incluidos eventos de forks; mantener fallo explícito y no introducir `pull_request_target` con código no confiable.

## 3. Rotación y compatibilidad del entorno integrado

- [x] 3.1 Documentar el procedimiento de respaldo, pausa del backend, cambio interactivo de contraseña del rol, actualización privada de `.env` y recreación de servicios conservando `postgres_data`; incluir recuperación sin volver a la credencial publicada.
- [x] 3.2 Verificar en una base desechable la inicialización limpia y la rotación sobre volumen existente: conexión TCP nueva acepta la contraseña nueva, rechaza la anterior y conserva registros representativos; adjuntar evidencia sanitizada.
- [x] 3.3 Ejecutar la rotación del entorno existente de forma coordinada con su operador y registrar su realización sin revelar valores; verificar noticias, términos, configuración y atribuciones antes/después, sin eliminar volúmenes.
- [x] 3.4 Verificar en Docker los flujos de lectura del dashboard, configuración, captura controlada y purga de datos caducados de prueba; ejecutar las comprobaciones de integración pertinentes sin alterar datos reales para probar la purga.

## 4. Validación y evidencia Sonar

- [x] 4.1 Añadir comprobaciones focalizadas de configuración que prevengan respaldos sensibles y validen el rechazo de credenciales ausentes, sin incluir secretos reales ni la contraseña antigua como datos de prueba.
- [ ] 4.2 Ejecutar validación silenciosa Compose, comprobación de contratos, pruebas backend y pipeline del PR; inspeccionar los logs y registrar resultados sin secretos.
- [x] 4.3 Revisar que el diff no contenga credenciales privadas ni exclusiones para ocultar `secrets:S6698`; validar este change con `openspec validate remove-exposed-postgresql-passwords --strict` y mantener coherentes sus artefactos.
- [ ] 4.4 Tras integrar, esperar el análisis finalizado de `main` y adjuntar enlace, fecha, SHA y estado de las dos incidencias originales; si siguen abiertas, revisar la causa antes de marcar esta tarea como completada. No declarar cerrada toda SNQ-04 sin revisar también sus otras incidencias.
