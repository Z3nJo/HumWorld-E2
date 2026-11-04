## 1. Fijar las dos referencias de CI

- [x] 1.1 Confirmar en el repositorio oficial la existencia del commit `b906affcce14559ad1aafd4ab0e942779e9f58b1`, su relación con `v4.3.0` y la compatibilidad de `package_json_file`; registrar la procedencia sin sustituirlo silenciosamente por una versión nueva.
- [x] 1.2 Reemplazar los dos usos de `pnpm/action-setup@v4` en `.github/workflows/ci.yml` por el SHA completo verificado y el comentario `# v4.3.0`, conservando parámetros, orden y todas las demás acciones.

## 2. Validar y documentar

- [x] 2.1 Comprobar YAML y diff: exactamente dos referencias de pnpm fijadas al mismo commit completo, ambas entradas `package_json_file` intactas y ningún cambio en versión de pnpm, lockfile, secretos, permisos o código de aplicación.
- [x] 2.2 Registrar en `evidence.md` la verificación del SHA, revisión del diff, comprobaciones disponibles y procedimiento de actualización conjunta de referencias; validar OpenSpec con `--strict` y ejecutar `git diff --check`.
- [ ] 2.3 Cuando se publique una PR autorizada, comprobar los dos pasos de preparación de pnpm y la ejecución de lint, pruebas y build habituales, además de los checks de CI y Sonar sobre su revisión exacta; registrar resultados sin dar por ejecutado CI mediante comprobaciones locales.
- [ ] 2.4 Verificar en Sonar el cierre de las dos issues `githubactions:S7637` de este workflow en la revisión integrada en `main`, sin suprimir reglas ni aceptar el Quality Gate global como sustituto del estado de las issues.
