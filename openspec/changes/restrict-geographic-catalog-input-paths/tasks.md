## 1. Definir y aplicar el límite de lectura

- [x] 1.1 Incorporar una política compartida anclada al backend instalado para las raíces fijas `data/geography` y `data/geography/sources`, sin ampliación por CLI o entorno.
- [x] 1.2 Implementar validación de existencia, resolución de enlaces, pertenencia por componentes, archivo regular y raíces no redirigidas; devolver la ruta validada y errores explícitos sin leer contenido rechazado.
- [x] 1.3 Validar conjuntamente todas las entradas de `generate` según su función antes de leer la primera; conservar el argumento opcional y la protección vigente de las salidas.
- [x] 1.4 Proteger `read_json`, `open_text_source` y `checksum` también al invocarlos directamente y abrir únicamente rutas validadas; mantener la lectura de ZIP sin extracción.
- [x] 1.5 Proteger `load_catalog` y cargar el catálogo autorizado antes de iniciar la sesión del seed; mantener el catálogo predeterminado y las validaciones de contenido existentes.

## 2. Adaptar la preparación y probar las restricciones

- [x] 2.1 Documentar la preparación de fuentes en `data/geography/sources`, el comando actualizado, los ámbitos por entrada, el traslado de fuentes externas y los límites frente a modificaciones concurrentes; añadir exclusiones precisas de datasets locales para Git y Docker sin excluir catálogo, manifiesto ni curación versionados.
- [x] 2.2 Adaptar los fixtures del generador a un backend temporal con las raíces autorizadas y conservar las comprobaciones de determinismo, conteos, aliases y checksums sin modificar los artefactos productivos.
- [x] 2.3 Añadir pruebas de rutas absolutas internas, relativas y subdirectorios; rechazar rutas externas, escapes con `..`, hermanos con prefijo común, fuentes fuera de `sources`, archivos inexistentes, directorios y archivos especiales disponibles en la plataforma.
- [x] 2.4 Probar enlaces externos, redirección de raíces y ancestros, enlaces internos válidos y junctions cuando estén disponibles; ejecutar en Linux o Windows según soporte y documentar cualquier caso no ejecutable.
- [x] 2.5 Probar los cuatro lectores invocados directamente, la validación de todas las entradas antes de cualquier lectura, el rechazo sin publicación de salidas y el catálogo inválido antes de iniciar el seed; usar archivos testigo inofensivos y comprobar que no se abren.

## 3. Verificar regresiones e integración

- [x] 3.1 Ejecutar las pruebas geográficas y las comprobaciones del backend exigidas por CI; confirmar generación determinista con fuentes autorizadas, rechazo de rutas externas por CLI con código no cero y conservación de salidas preexistentes.
- [x] 3.2 Verificar en Docker aislado y PostgreSQL desechable el arranque con catálogo predeterminado sin datasets descargados, la carga repetida idempotente y consultas del dashboard; mantener los servicios y datos habituales intactos y retirar solo recursos de prueba.
- [x] 3.3 Registrar comandos, resultados, plataformas, límites y casos de enlaces en `evidence.md`; comprobar que no se versionan datasets descargados ni datos privados y validar el cambio OpenSpec con `--strict`.
- [ ] 3.4 Cuando se publique una PR autorizada, comprobar CI y los cuatro flujos de Sonar sobre su revisión exacta, registrar resultados y resolver cualquier observación restante sin suprimir reglas; no marcar esta tarea completa solo con validaciones locales.
