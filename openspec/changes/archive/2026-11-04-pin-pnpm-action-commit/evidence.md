# Evidencia de fijación de la acción pnpm

Fecha: 2026-10-30. Implementación local; aún no publicada en una PR propia.

## Procedencia del commit

Se consultó el repositorio oficial con:

```text
git ls-remote --tags https://github.com/pnpm/action-setup.git refs/tags/v4*
```

Las referencias resueltas `refs/tags/v4^{}` y `refs/tags/v4.3.0^{}` apuntan a `b906affcce14559ad1aafd4ab0e942779e9f58b1`. La etiqueta anotada `v4` tiene su propio objeto `f40ffcd9367d9f12939873eb1018b921a783ffaa`, que no se usó como commit.

La [API oficial del commit](https://api.github.com/repos/pnpm/action-setup/commits/b906affcce14559ad1aafd4ab0e942779e9f58b1) confirmó el SHA y el [action.yml de esa revisión](https://github.com/pnpm/action-setup/blob/b906affcce14559ad1aafd4ab0e942779e9f58b1/action.yml) declara `package_json_file`. La etiqueta no se había desplazado respecto de la propuesta. No se eligió la revisión más reciente `v4.4.0` ni se actualizó pnpm.

## Cambio y verificación local

Se reemplazaron los dos `pnpm/action-setup@v4` de `.github/workflows/ci.yml` por:

```yaml
uses: pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1 # v4.3.0
```

Una comprobación puntual con Python y PyYAML ya disponible en el entorno local verificó:

- El YAML se puede analizar y contiene exactamente dos pasos de `pnpm/action-setup`.
- Ambos usan el mismo SHA completo de 40 caracteres hexadecimales.
- Ambos conservan exactamente `with: {package_json_file: frontend/package.json}`.
- El texto completo del workflow coincide con `git show HEAD:.github/workflows/ci.yml` al aplicar exclusivamente las dos sustituciones y comentarios. Permanecen intactos los otros pasos, acciones, permisos y referencias a secretos.
- `frontend/package.json` y `frontend/pnpm-lock.yaml` coinciden con `HEAD`.

`git diff --check` y `openspec validate pin-pnpm-action-commit --strict` finalizaron correctamente. No se añadieron pruebas o dependencias permanentes para reproducir estas dos líneas ni se ejecutó CI local con secretos reales.

## Actualizaciones futuras

Verificar el nuevo commit en `pnpm/action-setup`, revisar su diferencia y compatibilidad, y actualizar conjuntamente ambos SHA y comentarios de versión. La versión comentada corresponde a la acción, no al gestor pnpm declarado en `packageManager`.

## Pendiente remoto

Las tareas 2.3 y 2.4 siguen pendientes: publicar una PR autorizada, comprobar la ejecución de ambos pasos y de los checks habituales en su revisión exacta y verificar el cierre de las dos issues `githubactions:S7637` después de integrar en `main`. Una validación local o un Quality Gate aprobado no se registran como prueba de cierre de las issues.
