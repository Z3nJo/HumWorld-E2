# Credenciales PostgreSQL: desarrollo, CI y rotación

## Entorno Docker nuevo

Desde la raíz, copiar `.env.example` a `.env`. Ese archivo privado está ignorado
por Git; no pegarlo en issues, capturas ni logs. Mantener la plantilla sin valores
sensibles. Generar una contraseña aleatoria de al menos 32 bytes mediante un gestor
de contraseñas (la representación hexadecimal evita caracteres reservados de URL).

Completar `POSTGRES_PASSWORD` y `DATABASE_URL` en el archivo privado con el mismo
usuario, contraseña y base. La URL tiene formato
`postgresql://<usuario>:<password-codificado>@postgres:5432/<base>`; los marcadores
deben reemplazarse y no son una conexión lista para usar. El usuario/base por defecto
son `humworld`. Usar comillas simples de dotenv alrededor de valores que contengan
`$` o `#`. Para el password en la URL, aplicar codificación porcentual UTF-8
(por ejemplo `urllib.parse.quote(valor, safe='')`); en `POSTGRES_PASSWORD` conservar
el valor original. No codificar la URL completa.

```powershell
docker compose --env-file .env -f opsx/docker-compose.yml config --quiet
docker compose --env-file .env -f opsx/docker-compose.yml up --build -d
docker compose --env-file .env -f opsx/docker-compose.yml ps
```

No ejecutar `docker compose config` sin `--quiet` en evidencia pública: imprime
valores resueltos. Tampoco publicar `docker inspect` ni el contenido de `.env`.
Para ejecutar el backend fuera de Docker, usar `backend/.env` con host `localhost`.

## GitHub Actions

Crear el secreto de repositorio `CI_POSTGRES_PASSWORD` en Settings → Secrets and
variables → Actions, con una contraseña aleatoria privada de una sola línea,
distinta de desarrollo. No utilizar una variable pública de Actions.

El job `credentials-check` valida su presencia antes de crear el servicio. El job
de pruebas usa ese secreto para PostgreSQL; `opsx/ci_database_env.py` prepara la URL
del runner (`localhost`) y la de validación/build Compose (`postgres`), codifica
la contraseña y enmascara las representaciones antes de escribir `GITHUB_ENV`.
Las migraciones y pruebas mantienen autenticación real.

Si el secreto falta, CI falla explícitamente. Los PR desde forks no reciben secretos
del repositorio: deben revisarse con ese límite; no habilitar `pull_request_target`
para ejecutar su código con secretos. No sustituir el secreto ausente por un literal,
`trust` ni pruebas omitidas. Configurar el secreto antes de integrar este cambio.

## Rotar una instalación con volumen existente

`POSTGRES_PASSWORD` inicializa la base nueva; modificarlo no cambia un rol existente.
Conservar el volumen `postgres_data` y las credenciales nuevas durante el procedimiento.
Si el valor publicado se reutilizó en otro entorno, rotarlo allí también.

1. Preparar un `.env` privado válido para la configuración actual. Registrar conteos
   de `noticia`, `termino`, `configuracion` y `noticia_pais`, sin datos sensibles.
2. Pausar el backend para impedir capturas/purgas concurrentes y crear un respaldo:

   ```powershell
   docker compose --env-file .env -f opsx/docker-compose.yml stop backend
   docker compose --env-file .env -f opsx/docker-compose.yml exec postgres pg_dump -U humworld -d humworld -Fc -f /tmp/humworld-before-rotation.dump
   docker compose --env-file .env -f opsx/docker-compose.yml cp postgres:/tmp/humworld-before-rotation.dump ./.env.rotation-backup.dump
   ```

   El respaldo local coincide con `.env.*` y queda ignorado por Git. Protegerlo como
   dato privado y verificar que se creó correctamente antes de continuar. Si se cambió
   el usuario/base por defecto, ajustar los argumentos correspondientes.
3. Abrir una sesión interactiva sin poner la contraseña en la línea de comandos:

   ```powershell
   docker compose --env-file .env -f opsx/docker-compose.yml exec postgres psql -U humworld -d humworld
   ```

   Dentro de psql ejecutar `\password humworld`, introducir y confirmar la contraseña
   nueva cuando se solicite, y salir con `\q`. No grabar esa interacción.
4. Actualizar `POSTGRES_PASSWORD` y `DATABASE_URL` en el `.env` privado con el valor nuevo
   y su codificación correspondiente. Recrear sin eliminar el volumen:

   ```powershell
   docker compose --env-file .env -f opsx/docker-compose.yml config --quiet
   docker compose --env-file .env -f opsx/docker-compose.yml up -d --build --force-recreate
   ```

5. Verificar una conexión TCP nueva con contraseña solicitada interactivamente:

   ```powershell
   docker compose --env-file .env -f opsx/docker-compose.yml exec postgres psql -h postgres -U humworld -d humworld -W -c "SELECT 1"
   ```

   La contraseña nueva debe funcionar. Repetir con la anterior debe fallar; una conexión
   por socket sin `-h` ni por loopback (`127.0.0.1`) demuestra esta rotación: pueden
   estar configurados con `trust`. Usar el host de red `postgres` y comprobar que
   realmente rechaza la contraseña anterior. Verificar también API, dashboard y
   conteos conservados. Si se reactivó el scheduler, sus tareas pueden cambiar conteos:
   para compararlos exactamente, mantenerlo temporalmente deshabilitado.
6. Si falla la reconexión, mantener el backend pausado y corregir los valores privados.
   No restaurar la contraseña publicada ni ejecutar `down -v`. El respaldo se restaura
   únicamente ante pérdida de datos verificada. Retirar el respaldo temporal del
   contenedor después de verificar la copia privada, según la política del operador.

## Evidencia SNQ-04

Adjuntar resultados sanitizados de validación Compose, conexión TCP, persistencia y CI.
Después de integrar, registrar URL, SHA, rama y fecha del análisis terminado de Sonar
y comprobar las dos incidencias `secrets:S6698`. Retirar secretos del árbol actual
no borra su historial: la rotación es necesaria para invalidar el valor anterior.
Este cambio no declara solucionadas las demás incidencias de SNQ-04.
