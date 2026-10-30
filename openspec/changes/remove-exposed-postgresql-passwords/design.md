## Context

Véase `proposal.md` para la motivación. Compose configura tanto una contraseña PostgreSQL por defecto como una URL con credenciales literales. CI repite esa credencial en el servicio y la URL de pruebas, y ejecuta `docker compose config` sin suprimir la salida resuelta. El proyecto ya ignora `.env` y `.env.*`, exceptuando `.env.example`. PostgreSQL conserva los datos en `postgres_data` y el backend aplica Alembic y el seed geográfico al arrancar.

Este diseño es necesario por los cambios coordinados entre CI, Compose y la migración de una base ya inicializada.

## Goals / Non-Goals

**Goals:**
- Mantener un arranque reproducible que requiera credenciales privadas y detecte ausencias antes de iniciar servicios.
- Mantener pruebas con autenticación real y una misma contraseña para servidor y cliente.
- Rotar la contraseña publicada conservando noticias, diccionario, configuración y atribuciones.
- Verificar la resolución en Sonar mediante un análisis nuevo identificable por commit.

**Non-Goals:**
- Introducir un gestor de secretos externo, autenticación de usuarios o cambios HTTP.
- Reescribir el historial Git, modificar la base del usuario durante la planificación o resolver todas las incidencias de SNQ-04.
- Ocultar hallazgos mediante exclusiones de Sonar o rebajar su severidad.

## Decisions

### 1. Configuración local explícita, sin respaldos con contraseña

Compose requerirá `POSTGRES_PASSWORD` y `DATABASE_URL` mediante interpolación obligatoria; los valores por defecto no sensibles para usuario y nombre de base pueden mantenerse. Se conserva `DATABASE_URL` como interfaz de configuración del backend para evitar cambios de aplicación.

Una plantilla `.env.example` raíz contendrá las claves y valores sensibles vacíos, con instrucciones para generar una contraseña privada y completar una URL coherente. El arranque documentado usará `docker compose --env-file .env -f opsx/docker-compose.yml ...` desde la raíz: evita depender de la búsqueda implícita del archivo en diferentes directorios.

La contraseña debe ser la misma en PostgreSQL y en la URL. Se documentará el escape porcentual del componente contraseña cuando contenga caracteres reservados; para el camino recomendado se generará un valor aleatorio largo hexadecimal, sin caracteres que requieran ese escape. No se incluirá una contraseña de ejemplo funcional. Se descarta mantener un respaldo de desarrollo porque reproduce la incidencia y permite un arranque accidental con credenciales públicas.

La verificación de integración detectó que Alembic entrega esa URL a ConfigParser,
que interpreta `%` como interpolación. Su configuración debe escapar `%` como `%%`
al escribir la opción; ConfigParser devolverá la URL original al crear la conexión.
Es una adaptación de infraestructura necesaria para admitir credenciales codificadas.

### 2. Secreto de CI separado del entorno local

El workflow obtendrá `CI_POSTGRES_PASSWORD` desde GitHub Actions Secrets y lo usará para el servicio PostgreSQL. Un job previo comprobará su presencia antes de crear el servicio, porque GitHub inicia los servicios antes de los pasos del job. Tras configurar Python, un paso construirá la URL de pruebas en el runner con codificación segura de la contraseña, sin imprimirla. El valor y su representación codificada/URL completa se enmascararán antes de persistir la URL en el entorno de pasos posteriores. Las pruebas usan localhost; la validación/build de Compose recibirá separadamente una URL con host `postgres`, sin reemplazar la URL de pruebas.

La validación Compose utilizará `config --quiet` y los comandos posteriores no mostrarán el entorno resuelto. Se mantendrán las migraciones y pruebas obligatorias con autenticación; no se usará `trust` ni se sustituirá el secreto ausente por un literal.

Los PR desde forks no reciben por defecto los secretos del repositorio: el pipeline deberá mostrar un fallo explícito de provisión si no dispone del secreto. Una alternativa posterior sería un workflow con credencial efímera por ejecución; no se habilitará `pull_request_target` para ejecutar código no confiable con secretos. Se elige el secreto de repositorio por ser compatible con el servicio declarado antes de los pasos del job y con los PR internos usados en este proyecto.

### 3. Rotación del volumen existente mediante procedimiento operativo

Cambiar `POSTGRES_PASSWORD` no altera roles de un volumen ya inicializado. Antes del despliegue se preparará una copia de seguridad y se pausará el backend/scheduler. El operador cambiará la contraseña del rol mediante un mecanismo interactivo como `psql` y `\password`, sin pegarla en comandos versionados o logs, y actualizará el `.env` privado con el mismo valor y la URL correspondiente.

Se recrearán los contenedores con la nueva configuración conservando `postgres_data`. La validación debe abrir una conexión TCP nueva con la contraseña nueva y comprobar que la anterior ya no autentica; una conexión local de socket no demuestra esta rotación. Se compararán datos representativos antes y después. No se usará `down -v` ni se destruirá el volumen para resolver una discrepancia.

El asistente transmite `pg_dump` directamente a un archivo local creado con
`O_CREAT | O_EXCL` y modo `0600` (en Windows se aplican las ACL del usuario). No crea
archivos en directorios temporales compartidos del contenedor. Valida el archivo
mediante stdin de `pg_restore --list`; si falla el dump o su validación, detiene la
rotación. El procedimiento manual usa un directorio `0700` creado por `mktemp`
dentro del almacenamiento privado de PostgreSQL.

### 4. Evidencia y alcance de la revisión de secretos

La revisión localizará credenciales literales del mismo recorrido en archivos activos, plantillas y ejemplos de conexión, evitando reproducirlas en los artefactos nuevos. Las verificaciones automáticas no contendrán la antigua contraseña como fixture. La protección existente de Git se validará con `git check-ignore` sobre archivos locales y se comprobará que la plantilla permanezca versionable.

Se conservará evidencia sanitizada de Docker, CI y del nuevo análisis de `main`: fecha, SHA y estado de las dos incidencias `secrets:S6698`. Retirar el literal del árbol actual no lo borra del historial; la rotación invalida el valor anterior. Si se reutilizó en otros entornos, sus responsables también deberán rotarlo. La resolución de estas dos incidencias no basta por sí sola para declarar completada SNQ-04.

## Risks / Trade-offs

- [Secreto de CI no configurado] → Configurarlo antes del merge y fallar con un diagnóstico que solo mencione la clave ausente.
- [Variables de PostgreSQL y URL incoherentes] → Documentar la relación, probar la conexión real y cubrir una contraseña con caracteres reservados.
- [Filtración en logs de CI] → Validación silenciosa, enmascarado de representaciones derivadas y revisión de logs sin publicar valores reales.
- [Interrupción al rotar un volumen existente] → Pausar el backend, respaldo previo y prueba de reconexión; mantener el volumen.
- [Sonar tarda en actualizar o cambia el conjunto de incidencias] → Vincular evidencia al análisis terminado y revisar sus resultados reales; no cerrar tareas con capturas antiguas.

## Migration Plan

1. Preparar configuración de CI y guía de entorno local; comprobar las ausencias sin mostrar secretos.
2. En una base desechable, verificar arranque limpio y rotación conservando datos; utilizar credenciales privadas temporales.
3. En el entorno existente, respaldar, pausar backend, rotar el rol, actualizar `.env` y recrear sin borrar volúmenes. Esta operación se ejecutará durante implementación/despliegue con la autorización correspondiente al entorno.
4. Comprobar autenticación, migraciones y flujos frontend-backend; publicar el cambio y esperar el análisis Sonar del commit integrado.
5. Si falla la configuración, mantener pausado el backend y corregir la URL o credencial. Se puede desplegar el código anterior con credenciales externas nuevas; no restaurar la contraseña publicada como rollback. Usar el respaldo únicamente ante una pérdida de datos verificada.
