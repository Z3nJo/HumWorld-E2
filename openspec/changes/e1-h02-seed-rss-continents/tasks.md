## 1. Catalogo y comando de seed

- [x] 1.1 Crear el modulo `app.seeds.sources` con las seis entradas inmutables acordadas y verificar mediante una prueba parametrizada que cubren exactamente los seis continentes, usan URLs unicas y respetan los dominios de idioma e IPTC.
- [x] 1.2 Implementar la carga mediante una unica sesion y transaccion, con un solo `commit` y `rollback` ante errores; verificar que el comando `python -m app.seeds.sources` finaliza correctamente despues de `alembic upgrade head`.
- [x] 1.3 Implementar la deteccion de registros compatibles y colisiones por nombre de canal o URL; verificar que una reejecucion no duplica datos y que una incompatibilidad falla sin sobrescribir registros.

## 2. Verificacion sobre PostgreSQL

- [x] 2.1 Crear una prueba de integracion que prepare PostgreSQL migrado y limpio, ejecute el seed y verifique seis canales, seis fuentes activas y cobertura exacta de `Africa`, `America`, `Antartida`, `Asia`, `Europa` y `Oceania`.
- [x] 2.2 Extender la prueba de integracion con una segunda ejecucion y verificar que las cantidades y datos funcionales permanecen iguales.
- [x] 2.3 Probar una colision incompatible durante el lote y verificar que la transaccion conserva el estado previo completo; confirmar que ninguna prueba ni ejecucion del seed realiza solicitudes HTTP.

## 3. Documentacion y entrega

- [x] 3.1 Documentar en `backend/README.md` la secuencia `alembic upgrade head` y `python -m app.seeds.sources`, los seis continentes resultantes y el comportamiento idempotente; verificar los comandos desde una base limpia.
- [ ] 3.2 Ejecutar la suite completa con el umbral de cobertura de CI, la validacion OpenSpec estricta y el build de Docker Compose; verificar que todo finaliza correctamente y registrar la evidencia en el PR de E1-H02.
- [ ] 3.3 Confirmar que el diff no agrega endpoints, campos, migraciones de esquema ni dependencias de red, y que el PR tiene CI exitoso y revision cruzada antes de marcar E1-H02 como terminada.
