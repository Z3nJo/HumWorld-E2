## 1. Prerrequisitos y configuracion

- [x] 1.1 Confirmar que `INFRA-02` aporta PostgreSQL 16 en `opsx/docker-compose.yml` y que `CICD-00` ejecuta pytest con PostgreSQL; verificado mediante la configuracion y build de Docker Compose, el workflow integrado y el CI exitoso de la PR #5.
- [ ] 1.2 Agregar las dependencias de SQLAlchemy 2.0, Alembic, psycopg, configuracion y pruebas; verificar que `backend/requirements.txt` se instala correctamente en local y durante el build del contenedor.
- [ ] 1.3 Crear la configuracion por variables de entorno y la fabrica/ciclo de vida de sesiones, normalizando las URLs `postgresql://` de Docker Compose y CI a `postgresql+psycopg://`; verificar con pruebas que ambas URLs usan psycopg 3, que una configuracion valida conecta y que una incompleta falla claramente.

## 2. Persistencia

- [ ] 2.1 Implementar los dominios y modelos SQLAlchemy `Canal` y `FuenteRSS` conforme a MOD-01, incluyendo relacion, defaults y restricciones; verificar con pruebas parametrizadas los seis continentes, dos idiomas y 17 categorias IPTC.
- [ ] 2.2 Inicializar Alembic y crear solo la migracion de `canal` y `fuente_rss`; verificar `upgrade head`, el esquema y `downgrade base` sobre una base PostgreSQL vacia.
- [ ] 2.3 Implementar repositorios concretos para alta atomica, deteccion de duplicados, lista con filtros `continent`/`active`, detalle, `PUT`, `PATCH` y `DELETE`; verificar contra PostgreSQL que una falla revierte el lote y que eliminar la ultima fuente conserva el canal.

## 3. Servicio y API

- [ ] 3.1 Implementar el servicio de fuentes con alta por canal nuevo o existente, validaciones y CRUD sin permitir cambiar `id_canal`; verificar los tres criterios del Backlog Final, atomicidad, duplicados y recursos ausentes con pruebas unitarias.
- [ ] 3.2 Crear esquemas Pydantic minimos para alta, fuente, canal resumido, filtros, reemplazo, parche, respuestas y errores; verificar que el OpenAPI generado exige una lista no vacia y no expone `id_canal` como campo editable.
- [ ] 3.3 Implementar y registrar todas las rutas `/api/v1/sources`, junto con manejadores `400`, `404` y `500`; verificar CRUD, filtros, `204` sin cuerpo, ausencia de autenticacion y que validaciones no devuelven el `422` predeterminado.

## 4. Pruebas y calidad

- [ ] 4.1 Completar pruebas unitarias parametrizadas para dominios, alta simple/multiple, canal existente, rollback, duplicados, consultas, actualizaciones y eliminacion; verificar que pytest pasa sin requerir PostgreSQL para estas pruebas.
- [ ] 4.2 Completar pruebas API-PostgreSQL de todo el CRUD, filtros y persistencia despues de reiniciar la API; verificar que las migraciones se aplican en una base aislada y que la suite no usa SQLite.
- [ ] 4.3 Configurar y ejecutar cobertura minima de 80 % sobre el codigo nuevo y la suite en CI; verificar que pytest-cov y GitHub Actions fallan cuando el umbral o cualquier prueba no se cumplen.

## 5. Contratos y documentacion

- [ ] 5.1 Completar descripciones, ejemplos y respuestas de Swagger desde FastAPI y Pydantic; verificar visualmente `/api/docs` y programaticamente todas las operaciones obligatorias de `/api/v1/sources`.
- [ ] 5.2 Implementar una copia reproducible de los contratos finalizados desde `openspec/` hacia `opsx/contracts/`, sin edicion manual; verificar que regenerarla no produce diferencias cuando la fuente no cambia.
- [ ] 5.3 Actualizar README principal, `backend/README.md` y documentacion afectada con variables, migraciones, pruebas, uso de `/sources` y distincion entre fuente operativa y copia entregable OpenSpec; verificar los comandos documentados desde una instalacion limpia.

## 6. Validacion de entrega

- [ ] 6.1 Levantar `docker compose -f opsx/docker-compose.yml up --build`, aplicar migraciones y validar manualmente los tres criterios de E1-H01; verificar persistencia despues de reiniciar backend y guardar evidencia para el PR.
- [ ] 6.2 Ejecutar validacion OpenSpec estricta, pruebas, cobertura, revision de Swagger y build Docker; verificar que todo finaliza correctamente y registrar los resultados en el PR.
- [ ] 6.3 Confirmar rama, commits, PR, revision cruzada, CI y los puntos N1 aplicables de la Definition of Done antes de marcar E1-H01 como terminada.
