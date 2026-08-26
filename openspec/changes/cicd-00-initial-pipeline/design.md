## Contexto

Ver `proposal.md` para la motivacion. El repositorio actualmente contiene esqueletos Docker de backend y frontend para Sprint 0, un archivo `opsx/docker-compose.yml` y un workflow existente de GitHub Actions que construye servicios Docker. Los modulos de aplicacion aun no exponen manifiestos de paquete ni scripts de test/build, por lo que el pipeline debe aportar validacion significativa sin forzar scaffolding ficticio de aplicacion.

## Objetivos / No Objetivos

**Objetivos:**
- Mantener el workflow lo suficientemente simple para Sprint 0 y hacer visibles las fallas en pushes a `main`.
- Validar la configuracion de Compose antes de construir imagenes Docker.
- Construir todos los servicios Docker definidos por el archivo Compose.
- Agregar hooks de calidad y pruebas que se activen cuando los scripts de modulo se agreguen mas adelante.

**No Objetivos:**
- Desplegar a algun entorno.
- Publicar imagenes Docker en un registry.
- Introducir scaffolding de framework de aplicacion solo para satisfacer CI.
- Aplicar proteccion de ramas o configuraciones del repositorio fuera de la configuracion del workflow.

## Decisiones

### Decision: Usar un workflow inicial para validacion y build Docker

Usar un unico workflow de GitHub Actions bajo `.github/workflows/` para ejecutar los chequeos iniciales.

Razonamiento: Sprint 0 necesita una senal clara de verde/rojo, no un grafo complejo de workflows. Un unico workflow mantiene el criterio de finalizacion facil de inspeccionar en GitHub Actions.

Alternativa considerada: Separar calidad, pruebas y build Docker en workflows distintos. Se difiere porque los modulos aun no tienen superficies reales de scripts, y workflows separados agregarian ruido antes de aportar valor.

### Decision: Validar Compose antes de construir servicios

Ejecutar un paso de validacion de configuracion Compose antes del paso de build de servicios.

Razonamiento: Esto falla rapido ante problemas de sintaxis o configuracion y separa los problemas de parseo de Compose de los problemas de build de imagenes.

Alternativa considerada: Ejecutar solo `docker compose build`. Esto puede detectar muchos problemas, pero la senal de falla es menos precisa.

### Decision: Tratar scripts ausentes como chequeos omitidos, no como fallas

Para los pasos de calidad/pruebas de backend y frontend, verificar si el modulo expone el script correspondiente antes de ejecutarlo. Si el script no existe, reportar el paso como omitido o no-op exitoso.

Razonamiento: La ruta es conservadora: mantiene extensible el contrato de CI sin exigir archivos `package.json` de relleno ni pruebas falsas en Sprint 0.

Alternativa considerada: Exigir scripts `lint`, `test` y `build` inmediatamente. Se rechazo porque los modulos actuales estan documentados como esqueletos Docker vacios.

### Decision: Mantener despliegue fuera del pipeline inicial

No desplegar ni publicar imagenes como parte de CICD-00.

Razonamiento: Aun no hay entorno destino, registry ni politica de releases definidos. La superficie inicial de CD se limita a producir artefactos Docker construibles.

Alternativa considerada: Publicar imagenes en un registry en `main`. Se difiere hasta definir credenciales de registry, nombres de imagenes y estrategia de releases.

## Risks / Trade-offs

- Scripts ausentes pueden ocultar falta de cobertura de calidad -> Mitigacion: hacer explicitos los chequeos omitidos en la salida del workflow y agregar tareas de seguimiento cuando llegue el scaffolding de backend/frontend.
- El build Docker puede seguir verde aunque el comportamiento de aplicacion no este probado -> Mitigacion: acotar CICD-00 a infraestructura de Sprint 0 y exigir que cambios futuros de modulo agreguen pruebas reales.
- El exito en GitHub Actions depende de la disponibilidad de Docker en runners hospedados -> Mitigacion: usar el runner estandar `ubuntu-latest` y la CLI de Docker Compose disponible en ese entorno.

## Plan de Migracion

1. Actualizar la configuracion del workflow existente.
2. Hacer push del cambio a una rama y verificar el workflow en un pull request o rama manual de prueba si esta disponible.
3. Fusionar a `main`.
4. Confirmar que el workflow finaliza correctamente para el push a `main`.

Rollback: revertir el cambio de configuracion del workflow al contenido anterior de `.github/workflows/ci.yml`.
