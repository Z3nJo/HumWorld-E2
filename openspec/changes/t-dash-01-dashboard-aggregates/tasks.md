## 1. Consulta y lógica de agregación

- [ ] 1.1 Crear el repositorio de dashboards con la agregación `AVG`/`COUNT`, joins geográficos y filtros temporales/geográficos, y verificarlo con pruebas de integración PostgreSQL para resultados agrupados y filtrados.
- [x] 1.2 Crear el servicio de dashboards para validar la combinación de filtros, construir el intervalo UTC semiabierto, completar ámbitos sin datos, redondear a tres decimales y calcular `suficiente`; verificarlo con pruebas unitarias mediante dobles de repositorio y configuración.
- [x] 1.3 Añadir los modelos de respuesta y el router `GET /api/v1/dashboards`, registrarlo bajo `/api/v1` y verificar mediante una prueba HTTP que una consulta válida serializa el periodo, filtros y agregados esperados.

## 2. Términos influyentes

- [ ] 2.1 Crear la consulta PostgreSQL de términos influyentes con los filtros compartidos, joins desde `NOTICIA_TERMINO` hasta noticia y geografía, agrupación por término, cálculo de `peso`, `aporte_total` y `frecuencia`, orden determinista y límite fijo de 32; verificarla con pruebas de integración sobre conjuntos mayores y menores al límite.
- [x] 2.2 Crear el servicio, los modelos de respuesta y el router `GET /api/v1/dashboards/nube-palabras`, registrarlo bajo `/api/v1` y verificar mediante pruebas HTTP la serialización del periodo, filtros y campos de cada término.
- [ ] 2.3 Añadir pruebas para demostrar que `peso` suma los valores absolutos sin cancelar signos, que `aporte_total` conserva el signo acumulado, que `frecuencia` suma ocurrencias, que los empates se resuelven por frecuencia e identificador y que los términos inactivos conservan sus aportes históricos.

## 3. Validación de los contratos

- [x] 3.1 Actualizar las pruebas HTTP de ambos endpoints con fechas ausentes, mal formadas o invertidas, continentes inválidos, países con formato inválido y país sin continente, verificando respuesta `400` sin invocar consultas de datos.
- [ ] 3.2 Extender las pruebas de integración PostgreSQL para comprobar en ambos endpoints los extremos inclusivos del rango UTC, la exclusión de noticias fuera del periodo o con humor nulo, y la pertenencia geográfica mediante noticia, fuente y canal.
- [ ] 3.3 Añadir pruebas para ámbitos sin datos y para valores de `suficiente` por debajo, en y sobre `humor.minimo_noticias_agregacion`, verificando `humor`, `noticias` y `suficiente`.
- [x] 3.4 Actualizar las pruebas de OpenAPI para comprobar `GET /api/v1/dashboards` y `GET /api/v1/dashboards/nube-palabras`, sus cuatro parámetros, esquemas de respuesta y códigos `200`, `400` y `500`, verificando además que no se publique una respuesta `422`.

## 4. Verificación final

- [x] 4.1 Ejecutar la suite backend sin integración y verificar que finaliza correctamente sin regresiones.
- [ ] 4.2 Ejecutar la suite completa contra PostgreSQL migrado con cobertura y verificar que supera el umbral vigente del proyecto.
- [ ] 4.3 Revisar el diff final y verificar que no incluye migraciones, dependencias nuevas, cambios de frontend, `/sources`, seeds ni endpoints distintos de `/dashboards` y `/dashboards/nube-palabras`.
