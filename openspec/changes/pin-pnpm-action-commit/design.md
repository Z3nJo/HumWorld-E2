## Context

Ver `proposal.md` para la motivación. `.github/workflows/ci.yml` prepara pnpm dos veces, antes de lint y antes de las pruebas frontend. Ambas referencias usan `pnpm/action-setup@v4` y `package_json_file: frontend/package.json`. El proyecto declara su versión de pnpm en `packageManager`; no debe confundirse con la versión de la acción instaladora.

## Goals / Non-Goals

**Goals:** Fijar las dos ejecuciones de la acción a una revisión explícita y verificable, conservando sus entradas y el comportamiento del pipeline.

**Non-Goals:** Actualizar acciones o pnpm, refactorizar pasos, fijar todas las acciones del repositorio o cambiar permisos, secretos y código de la aplicación.

## Decisions

### 1. Usar el commit actual verificado, no una etiqueta ni el objeto tag

El 2026-10-30 se consultaron las referencias del [repositorio oficial](https://github.com/pnpm/action-setup) mediante `git ls-remote --tags`:

- `refs/tags/v4`: objeto tag `f40ffcd9367d9f12939873eb1018b921a783ffaa`.
- `refs/tags/v4^{}`: commit `b906affcce14559ad1aafd4ab0e942779e9f58b1`.
- `refs/tags/v4.3.0^{}`: el mismo commit.

La API oficial confirmó [ese commit](https://github.com/pnpm/action-setup/commit/b906affcce14559ad1aafd4ab0e942779e9f58b1) y su `action.yml` conserva la entrada `package_json_file`. El SHA elegido es el commit resuelto, no el SHA del objeto de la etiqueta anotada. Aunque existe una etiqueta `v4.4.0`, actualizar a ella queda fuera del alcance.

Aplicar en ambas ubicaciones `uses: pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1 # v4.3.0`. Durante la implementación confirmar de nuevo la existencia y procedencia del commit; si la etiqueta mutable se ha desplazado, mantener el commit verificado de esta propuesta y registrar la diferencia, sin actualizar silenciosamente la revisión.

La alternativa de una etiqueta completa como `v4.3.0` sigue siendo mutable. Un SHA abreviado no satisface el requisito de referencia completa. Fijar la acción no verifica por sí solo cada descarga o dependencia que esta ejecute: el cambio reduce la mutabilidad de la referencia externa del workflow.

### 2. Conservar parámetros y alcance

Mantener `package_json_file: frontend/package.json` y el orden de los dos pasos. No añadir `version` ni modificar `packageManager`, el lockfile o las otras acciones. El comentario registra la versión de la acción, no la versión de pnpm instalada. Las actualizaciones futuras deberán verificar un commit oficial nuevo, revisar su diferencia y actualizar ambos SHA y comentarios juntos.

### 3. Verificar el workflow real

Revisar el diff para comprobar exactamente dos referencias modificadas y confirmar SHA completo idéntico, YAML válido y parámetros intactos. Usar las herramientas de validación disponibles sin introducir nuevas dependencias permanentes ni pruebas que solo dupliquen las dos líneas.

La comprobación decisiva se realizará cuando una PR autorizada active GitHub Actions: confirmar que ambos pasos preparan pnpm, que lint, pruebas y construcción habituales se ejecutan y que los checks de CI y Sonar corresponden a la revisión publicada. Comprobar el cierre de las dos issues `githubactions:S7637`, no solo el Quality Gate global. No ejecutar el workflow localmente con secretos reales ni suprimir la regla para obtener un resultado verde.

## Risks / Trade-offs

- Referenciar el objeto tag en lugar del commit puede incumplir el requisito → usar la referencia resuelta y comprobar el objeto commit en el repositorio oficial.
- Las actualizaciones dejan de ser implícitas → revisar y actualizar los dos SHA de forma deliberada, manteniendo la versión como comentario.
- Una validación local no ejecuta el entorno de GitHub → mantener pendiente la verificación remota hasta disponer de una PR autorizada.

## Migration Plan

No requiere despliegue ni migración de datos. Publicar las dos sustituciones después de la revisión local y verificar el pipeline. Si el commit no puede ejecutarse, investigar el error antes de seleccionar otra revisión oficial; evitar volver a una etiqueta mutable como solución permanente.
