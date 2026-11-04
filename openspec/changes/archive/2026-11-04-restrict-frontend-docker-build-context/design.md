## Context

Ver `proposal.md` para la motivación. Compose usa `frontend/` como contexto: el `.env` de la raíz del repositorio ya queda fuera. El problema afecta a archivos que estén o puedan aparecer dentro de `frontend/`.

El Dockerfile instala dependencias desde `package.json` y `pnpm-lock.yaml` y después copia todo el contexto. El `.dockerignore` actual solo contempla `node_modules`, `dist`, `.git` y logs. Vite recibe `VITE_API_TARGET` del entorno del contenedor y proporciona el proxy `/api`; este mecanismo debe conservarse.

## Goals / Non-Goals

**Goals:** Reducir los archivos enviados al constructor y los incorporados a las capas de la imagen, conservando los recursos para desarrollo, build, lint y pruebas del frontend.

**Non-Goals:** Convertir el servicio a una arquitectura de producción, actualizar bibliotecas de ejecución, gestionar credenciales de paquetes privados o resolver las otras issues High.

## Decisions

### 1. Copias explícitas de recursos conocidos

Conservar la instalación con lockfile antes del código. Sustituir `COPY . .` por copias de `index.html`, `vite.config.ts`, `eslint.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/` y `public/`. Mantener Node, Corepack, pnpm, comando de inicio y puerto existentes. Los tests y su configuración permanecen disponibles porque forman parte de `src/` y de la configuración de Vite.

La alternativa de conservar una copia global confiando únicamente en exclusiones mantiene la inclusión implícita de nuevos archivos. Una imagen multietapa con servidor estático modifica el funcionamiento del proxy y excede este cambio.

### 2. Exclusiones también dentro de los directorios permitidos

Reforzar `frontend/.dockerignore` con patrones que cubran raíz y niveles anidados: `.env`, `.env.*`, `.npmrc`, `*.pem`, `*.key`, `.git`, `node_modules`, `dist`, `coverage`, `test-results`, `playwright-report` y logs. Usar la sintaxis recursiva de Docker, verificando su comportamiento mediante archivos testigo. `.env.example` también puede excluirse de la imagen: sirve de documentación local y no es necesario en ejecución.

Las copias explícitas limitan lo que se incluye en las capas; las exclusiones evitan transmitir categorías privadas al constructor incluso cuando se encuentran dentro de `src/` o `public/`. No se presupone que cualquier contenido de código fuente sea seguro: una credencial escrita en un archivo de código requiere una corrección independiente.

### 3. Configuración mediante el entorno existente

Conservar `VITE_API_TARGET=http://backend:3000` en Compose. No copiar `.env` para configurar Docker ni introducir secretos en variables `VITE_*`, cuyos valores pueden publicarse en el navegador. El desarrollo directo con Vite fuera de Docker no cambia. Documentar esta diferencia y la necesidad de actualizar las copias cuando aparezcan recursos nuevos.

### 4. Verificación del contexto y de la integración

Crear una copia temporal aislada del contexto con archivos testigo de contenido inofensivo en raíz y en subdirectorios permitidos. No copiar configuraciones privadas reales a esa copia. Construir sin caché una imagen auxiliar que permita inventariar el contexto filtrado y comprobar que los testigos excluidos no llegaron al constructor. Construir además el Dockerfile real con ese contexto y comprobar los archivos necesarios presentes y los testigos ausentes en la imagen.

Ejecutar build, lint y tests dentro de la imagen resultante. Iniciar un contenedor temporal con nombre y puerto disponibles, conectado a la red del backend integrado, sin recrear PostgreSQL. Comprobar la página, una ruta del SPA, los recursos públicos y un GET de `/api/v1/config` a través del proxy. Retirar únicamente los recursos creados por la comprobación. Registrar comandos, resultados y revisión analizada; cualquier fallo previo ajeno al cambio debe identificarse y no darse por aprobado.

La revisión de Sonar se completará cuando una PR autorizada dispare el análisis de la nueva revisión. No suprimir ni excluir el Dockerfile del análisis para conseguir el resultado.

### 5. Dependencias directas de los tipos importados

La validación inicial confirmó que el build limpio ya fallaba con el Dockerfile anterior: las fuentes importan tipos de `geojson` y `topojson-specification`, pero el manifiesto solo los recibe transitivamente. La ampliación autorizada declara `@types/geojson` y `@types/topojson-specification` como dependencias de desarrollo directas, con las versiones ya presentes en el lockfile (7946.0.16 y 1.0.5). Se mantiene la instalación con `--frozen-lockfile` y se validan los cambios con una nueva imagen limpia.

No se añaden declaraciones artificiales, enlaces manuales ni relajaciones del compilador. Esta corrección satisface el escenario existente de construir desde un checkout sin dependencias locales; no requiere cambiar el contrato de la especificación.

## Risks / Trade-offs

- Un recurso futuro fuera de las rutas permitidas no llegará a la imagen → documentar la lista y comprobar build y ejecución después de ampliarla.
- Una exclusión demasiado amplia podría ocultar un recurso legítimo → comprobar los archivos públicos y la aplicación construida; no introducir excepciones para credenciales reales.
- Una imagen antigua conserva sus capas originales → reconstruir y reemplazar la imagen utilizada; este cambio no elimina imágenes o cachés históricas de otros equipos.
- Las copias de `src/` y `public/` siguen siendo recursivas → limitar sus destinos, aplicar exclusiones anidadas y revisar el hallazgo de Sonar sobre la nueva revisión; no prometer que el análisis remoto lo cierre antes de ejecutarlo.

## Migration Plan

No requiere migración de datos. Actualizar las reglas de empaquetado, verificar con contexto aislado y reconstruir el servicio frontend conservando su entorno. Antes de reemplazar un contenedor en uso, completar las verificaciones de la imagen temporal. Si se detecta un recurso necesario omitido, añadirlo expresamente y reconstruir; evitar restaurar la copia indiscriminada como solución permanente.
