# Evidencia local — 30 de octubre de 2026

Rama de implementación: `fix/remove-exposed-postgresql-passwords`.
Esta evidencia corresponde al árbol de trabajo local, todavía sin commit ni pipeline
remoto de este cambio. No contiene credenciales ni datos de noticias.

## Configuración y pruebas

- Ocho comprobaciones de credenciales/Compose: correctas. Cubren secreto ausente,
  secreto multilínea rechazado, codificación y recuperación de caracteres reservados,
  enmascarado de representaciones derivadas, hosts separados runner/Compose,
  ausencia de respaldo sensible y variables vacías/ausentes rechazadas por Compose.
- `git check-ignore`: `.env`, `backend/.env` y el respaldo privado están ignorados;
  `.env.example` es versionable.
- Rotación en PostgreSQL 16 desechable con volumen propio: correcta. El registro de
  referencia persistió después del cambio y reinicio; la contraseña nueva autenticó
  por la dirección de red y la anterior fue rechazada. El contenedor y volumen de
  prueba se eliminaron después de verificarlo.
- Sobre esa base rotada, con contraseña temporal que incluye caracteres reservados,
  `alembic upgrade head` y `python /repo/opsx/sync_contracts.py --check`: correctos.
- `pytest -q -p no:cacheprovider` dentro de la imagen backend con el código actual:
  **289 passed**, 11 advertencias de deprecación; 28,45 segundos de pytest. Incluye
  escenarios API/PostgreSQL de captura controlada, configuración, dashboards y purga.
- El fallo inicial de ConfigParser con URLs codificadas se corrigió escapando `%`
  en la configuración de Alembic; la repetición completa anterior pasó.

Para repetir los checks desde PowerShell con Python y Docker disponibles:

```powershell
$env:RUN_DOCKER_CREDENTIAL_TESTS='1'
$env:RUN_POSTGRES_ROTATION_TEST='1'
py -3 -m unittest discover -s opsx/tests -v
```

Para repetir además la suite backend en el PostgreSQL desechable, se requiere la
imagen local `opsx-backend:latest` y añadir:

```powershell
$env:RUN_INTEGRATED_CREDENTIAL_TESTS='1'
py -3 -m unittest discover -s opsx/tests -p test_postgresql_rotation.py -v
```

Los valores de prueba se generan durante la ejecución. No utilizar estos comandos
para obtener ni imprimir el contenido de `.env`.

## Rotación del entorno existente

El usuario autorizó explícitamente rotar y conservar los datos. Se pausó el backend,
se creó y verificó un respaldo privado de PostgreSQL y se copió a un archivo ignorado
`.env.rotation-backup-<fecha>.dump` en la raíz. Se generó una contraseña privada nueva,
se actualizó el rol y se creó el `.env` privado raíz con la conexión coherente.

La recreación conservó el volumen original. Con scheduler temporalmente deshabilitado,
los conteos de `noticia`, `termino`, `configuracion` y `noticia_pais` fueron iguales
antes y después. La conexión por host de red `postgres` aceptó la contraseña nueva
y rechazó la anterior explícitamente por autenticación.

La limpieza del dump temporal devolvió inicialmente un error porque la recreación
del contenedor ya lo había eliminado; la copia privada validada se conservó. Se hizo
idempotente esa limpieza y se completó la reactivación del backend. No se borraron
volúmenes ni datos de la aplicación. El script auxiliar rehúsa sobrescribir un `.env`
ya existente; futuras rotaciones siguen el procedimiento interactivo documentado.

Verificación final: `scheduler_enabled=True`; PostgreSQL saludable y los tres
servicios activos. A través de `http://localhost:5173` respondieron **200**:

- `/`
- `/api/v1/config`
- `/api/v1/sources`
- `/api/v1/dashboards?fecha_desde=2026-10-30&fecha_hasta=2026-10-30`

También respondieron correctamente OpenAPI y el dashboard directamente en el backend.
La base real no se utilizó para ejecutar pruebas destructivas de purga/captura.

## Pendiente fuera de la verificación local

- Configurar `CI_POSTGRES_PASSWORD` como secreto del repositorio GitHub y ejecutar
  el pipeline del PR. Los casos de secretos no disponibles (como forks) se verificaron
  localmente por ausencia de variable; no se ejecutó un PR desde fork.
- Revisar los logs remotos y registrar URL/SHA/resultado del pipeline (tarea 4.2).
- Integrar y esperar un análisis SonarQube Cloud de `main`; registrar su SHA, fecha
  y el estado de las dos incidencias `secrets:S6698` (tarea 4.4).

No se declara SNQ-04 completada con pruebas locales solamente.

## Corrección de python:S5443 en PR #93

El análisis de la PR identificó la ruta predecible del dump en un directorio temporal
compartido. Se eliminó ese archivo intermedio: el asistente ahora transmite el dump
binario a un archivo local exclusivo (`O_EXCL`, `0600` en Unix) y valida por stdin.
No se añadieron exclusiones ni cambios de severidad en Sonar.

Pasaron 12 comprobaciones de credenciales/Compose y respaldo, incluidas cuatro
pruebas nuevas de streaming binario, rechazo de sobrescritura, fallo de dump y fallo
de validación. La prueba de rotación desechable se omitió en esta repetición porque
no cambia la lógica de contraseña. Un respaldo real se creó y validó por streaming
con `pg_restore`; se eliminó únicamente el archivo de esa prueba. No se rotó de nuevo
la base ni se modificaron sus registros. Falta confirmar el resultado del nuevo
análisis de Sonar sobre el commit de esta corrección.
