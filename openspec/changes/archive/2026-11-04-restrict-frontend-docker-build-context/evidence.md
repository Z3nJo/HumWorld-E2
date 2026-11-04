# Evidencia de empaquetado del frontend

Fecha: 2026-10-30. Revisión de partida: `22ba603cdda5f0a35fdcae55516fd119f323b620`, con modificaciones locales del presente cambio. Esta evidencia no corresponde todavía a un commit publicado ni a un análisis remoto de Sonar.

## Cambios

- `frontend/Dockerfile`: reemplazo de la copia global por copias explícitas; se conservan imagen base, instalación con lockfile, Vite y puerto 5173.
- `frontend/.dockerignore`: exclusiones recursivas para configuraciones privadas, claves, metadatos y resultados locales.
- `frontend/README.md`: recursos admitidos, configuración de Docker y mantenimiento de las copias.
- `frontend/package.json` y `frontend/pnpm-lock.yaml`: ampliación autorizada para declarar directamente `@types/geojson` y `@types/topojson-specification` como dependencias de desarrollo, conservando las versiones ya resueltas 7946.0.16 y 1.0.5.

## Procedimiento y resultados

Se creó un contexto temporal aislado a partir de archivos versionados de `frontend/`, usando sus contenidos actuales. No se copiaron archivos privados reales. No se usaron dependencias locales para construir la imagen.

Se añadieron 14 archivos testigo por ubicación, en tres ubicaciones: raíz, `src/__packaging_probe__/deep/` y `public/__packaging_probe__/deep/`. Los nombres fueron `.env`, `.env.local`, `.env.example`, `.npmrc`, `probe.pem`, `probe.key`, `probe.log`, `probe.log.1` y un archivo dentro de cada directorio `node_modules`, `dist`, `.git`, `coverage`, `test-results` y `playwright-report`. Todo el contenido era texto inofensivo. Se añadió además `__unselected_probe__.txt` en raíz como control de las copias explícitas.

Para reproducir, crear ese contexto aislado, copiar también el Dockerfile y `.dockerignore` actuales y ejecutar desde la raíz del repositorio los siguientes comandos, reemplazando `<contexto>` por su ruta. El Dockerfile auxiliar se suministra por stdin y solo se utiliza para observar las exclusiones:

```powershell
"FROM node:22-alpine`nCOPY . /context/`n" | docker build --no-cache -t humworld-frontend-context-check:local -f - <contexto>
docker run --rm humworld-frontend-context-check:local find /context -type f
docker build --no-cache -t humworld-frontend-packaging-check:local <contexto>
docker image save -o <archivo-temporal.tar> humworld-frontend-packaging-check:local
```

Resultados comprobados:

- Los 42 testigos excluidos estuvieron ausentes del inventario del contexto filtrado. El archivo raíz de control estuvo presente en ese inventario, demostrando que su ausencia posterior se debe a las copias explícitas.
- La construcción real sin caché terminó correctamente.
- Se abrió el archivo de `docker image save`, se leyó `manifest.json` y se recorrieron los miembros de cada tar indicado en `Layers`: ninguno de los 42 testigos ni el archivo raíz de control apareció bajo `/app` en ninguna de las **12 capas**. No se imprimió contenido de configuraciones privadas.
- Una comprobación con Node dentro de la imagen confirmó manifiestos, lockfile, índice HTML, configuraciones Vite/ESLint/TypeScript, `src/setupTests.ts`, ambos SVG públicos y `node_modules` instalado por la construcción.

## Validación inicial, antes de ampliar el alcance

Comandos ejecutados dentro de la imagen nueva:

```powershell
docker run --rm humworld-frontend-packaging-check:local pnpm run build
docker run --rm humworld-frontend-packaging-check:local pnpm run lint
docker run --rm humworld-frontend-packaging-check:local pnpm test
```

- **Lint:** correcto, código de salida 0.
- **Build:** falla, código de salida 2. TypeScript no encuentra `geojson` y `topojson-specification`; aparecen errores derivados de esos tipos en `DashboardMap.tsx` y `globeParticles.ts`.
- **Control del build anterior:** se creó otro contexto aislado con las mismas fuentes y con `Dockerfile` y `.dockerignore` obtenidos de `git show HEAD:frontend/<archivo>`. La construcción Docker anterior terminó y `pnpm run build` dentro de esa imagen reprodujo los mismos errores, código 2. Por tanto, este fallo no fue introducido por las copias explícitas. No se modificaron dependencias para ocultarlo.
- **Primera ejecución de pruebas:** 200 correctas y una fallida por timeout de 5000 ms en `SourcesPage > opens create drawer, validates fields, and creates a source with POST /sources`. Coincidió con lint y la comprobación del build anterior; se repite la suite sin esos procesos para investigar el timeout sin alterar umbrales ni pruebas.
- **Segunda ejecución de la suite completa, sin procesos de validación concurrentes:** **201 pruebas correctas en 26 archivos**, código 0, duración 17,62 s. No se modificaron código, configuración, timeouts ni pruebas entre ambas ejecuciones. El primer timeout no se reprodujo en la repetición.

## Validación de la ampliación autorizada

Se declararon directamente los dos paquetes de tipos y se añadieron sus entradas al importador del lockfile. Las resoluciones y sus integridades ya estaban presentes; no se actualizaron versiones de otras dependencias.

Se repitió la construcción aislada con 42 testigos y un archivo raíz ajeno a las copias. La primera construcción se ejecutó sin caché y confirmó la instalación congelada. Tras corregir la codificación de salida del script local de verificación en Windows, se reconstruyó el mismo contexto aprovechando las capas disponibles y se continuaron las comprobaciones. Ese ajuste solo afectó a la impresión de resultados del script temporal.

- La instalación con `pnpm install --frozen-lockfile` terminó correctamente.
- Los 42 testigos y el archivo raíz de control estuvieron ausentes de las 12 capas de la imagen actualizada.
- `pnpm run build`: correcto, incluyendo TypeScript y compilación Vite de 698 módulos.
- `pnpm run lint`: correcto.
- `pnpm test`: **201 pruebas correctas en 26 archivos**, código 0, duración 24,45 s.
- Contenedor temporal conectado a la red del backend existente, con `VITE_API_TARGET=http://backend:3000` y puerto del host asignado automáticamente: GET `/`, `/dashboard`, `/favicon.svg`, `/icons.svg` y `/api/v1/config` respondieron HTTP 200. Se comprobó HTML con raíz React para las páginas, contenido SVG para recursos públicos y un objeto JSON para la respuesta del backend por el proxy.

Para reproducir la comprobación HTTP, iniciar la imagen en la red del backend con un nombre temporal y publicar `127.0.0.1::5173`, consultar el puerto con `docker port <contenedor> 5173/tcp` y realizar los cinco GET anteriores. Usar únicamente consultas; no ejecutar capturas ni purgas como parte de esta verificación.

## Estado de cierre

La validación local del alcance ampliado está completada: instalación congelada, exclusiones, capas, build, lint, pruebas e integración HTTP. Los contenedores originales de frontend, backend y PostgreSQL no se han reemplazado ni reiniciado.

El usuario autorizó ampliar el alcance para corregir el build limpio. Se actualizaron propuesta, diseño y tareas para incluir las dependencias directas de tipos; no se cambió el contrato de la especificación porque ya exigía construir desde un checkout limpio.

Se retiraron los contextos y archivos tar temporales, los contenedores de comprobación y las etiquetas de las tres imágenes auxiliares iniciales y de la imagen de revalidación. Se retiraron también los scripts y logs locales de la verificación. No se realizó una purga global de imágenes o cachés Docker. Los tres servicios originales permanecen en ejecución.

CI y Sonar remotos: pendientes de publicar una PR autorizada y analizar su revisión exacta. No se ha suprimido el hallazgo ni excluido el Dockerfile del análisis. El resultado local no permite afirmar que la issue remota esté cerrada.
