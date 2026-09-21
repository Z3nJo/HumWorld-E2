## 1. Persistencia del diccionario

- [x] 1.1 Crear la revisión Alembic y el modelo SQLAlchemy de `termino` con identificador, palabra, idioma, valor `NUMERIC`, estado, fechas, unicidad `(palabra, idioma)` y dominio `es`/`en`; verificar upgrade, downgrade y metadata mediante pruebas sobre PostgreSQL.
- [x] 1.2 Registrar `Term` en la metadata compartida y comprobar que las migraciones desde una base vacía y desde el `head` anterior finalizan correctamente sin alterar tablas existentes.
- [x] 1.3 Implementar el repositorio de términos con listado ordenado, búsqueda parcial segura, detalle y escrituras transaccionales; verificar consultas, persistencia y rollback con pruebas PostgreSQL.

## 2. Reglas de negocio

- [x] 2.1 Implementar el servicio y sus datos de entrada para normalizar palabras, validar decimal finito e idioma, aplicar defaults y detectar duplicados; verificar con pruebas unitarias palabras con espacios, mayúsculas, tildes, idiomas distintos y entradas inválidas.
- [x] 2.2 Implementar creación, detalle, listado/búsqueda, reemplazo y actualización parcial conservando identificador y fecha de alta; verificar respuestas de servicio, fecha de modificación, PATCH parcial y rollback ante conflictos.
- [x] 2.3 Implementar DELETE como desactivación lógica idempotente y verificar que conserva el registro, actualiza la fecha solo en la primera desactivación y distingue un identificador inexistente.

## 3. Contrato REST y OpenAPI

- [x] 3.1 Añadir schemas Pydantic para POST, PUT, PATCH y respuesta, incluyendo PATCH no vacío y valor decimal finito; verificar validaciones y serialización JSON con pruebas de schemas/API.
- [x] 3.2 Añadir el router `/api/v1/dictionary`, su dependencia de servicio y el mapeo de errores `400`/`404`/`500`; verificar GET de lista, búsqueda y detalle, POST `201`, PUT/PATCH `200` y DELETE `204` sin autenticación.
- [x] 3.3 Registrar el router y ampliar las pruebas OpenAPI para comprobar que todas las operaciones, ejemplos, schemas y códigos estándar aparecen en `/api/docs` y `/api/openapi.json`.

## 4. Integración y cierre

- [x] 4.1 Añadir pruebas API–PostgreSQL para persistencia tras reinicio de sesión, unicidad normalizada, búsqueda con mayúsculas y tildes, actualizaciones atómicas y desactivación; verificar que se ejecutan en el conjunto de integración usado por CI.
- [x] 4.2 Actualizar README y crear evidencia de E2-H01-API con los comandos y resultados; verificar manualmente el CRUD completo y Swagger dentro de Docker Compose.
- [x] 4.3 Ejecutar la suite completa del backend, la cobertura aplicable y `openspec validate e2-h01-dictionary-api --strict`; verificar cero fallos, CI compatible y todos los artefactos/tareas del cambio listos para revisión.
