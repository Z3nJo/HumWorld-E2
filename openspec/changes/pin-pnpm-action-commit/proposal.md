## Why

Sonar identifica dos issues High `githubactions:S7637` en las referencias a `pnpm/action-setup@v4` del workflow de CI. Una etiqueta mutable puede dirigir ejecuciones futuras a un código distinto sin que cambie el workflow; fijar el commit hace explícita la revisión de la acción ejecutada.

## What Changes

- Sustituir las dos referencias a `pnpm/action-setup@v4` en `.github/workflows/ci.yml` por el mismo SHA completo de un commit verificado del repositorio oficial.
- Conservar el commit que resuelve la etiqueta actual, los parámetros `package_json_file: frontend/package.json`, el orden de pasos y la versión de pnpm declarada en el proyecto.
- Documentar junto a las referencias la versión de la acción y registrar la procedencia del SHA y los resultados de CI/Sonar en la evidencia del cambio.
- Comprobar que el workflow publicado sigue ejecutando sus validaciones y que las dos issues se cierran sin suprimir reglas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `python-postgres-cicd-stack`: exigir que los usos de la acción de preparación de pnpm en CI referencien un commit completo verificado, conservando la preparación y los chequeos actuales.

## Impact

Afecta únicamente a las dos referencias de acción del workflow y a la documentación OpenSpec asociada. No cambia la página, endpoints, datos, paquetes de la aplicación, versión de pnpm, secretos ni configuración Docker.

No incluye fijar otras acciones, actualizar versiones, añadir Dependabot, reordenar o consolidar pasos ni cambiar permisos del workflow. Las actualizaciones futuras de esta acción deberán revisar y sustituir el SHA explícitamente.
