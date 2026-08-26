## Por Que

HumWorld necesita un pipeline inicial de CI/CD que verifique que el repositorio puede construirse de forma consistente antes de comenzar el desarrollo funcional. El Sprint 0 ya define esqueletos de proyecto basados en Docker, por lo que el primer pipeline debe enfocarse en validaciones confiables sin inventar pruebas de aplicacion antes de que existan los modulos reales de backend y frontend.

## Cambios

- Agregar un contrato de pipeline inicial en GitHub Actions para pushes a la rama `main`.
- Validar la configuracion de Docker Compose antes de construir servicios.
- Construir las imagenes Docker de backend y frontend usando el archivo Compose existente.
- Preparar pasos conservadores de calidad y pruebas que solo se ejecuten cuando un modulo exponga los scripts correspondientes.
- Mantener el despliegue y la publicacion de imagenes fuera del alcance de este cambio inicial.

## Capacidades

### Capacidades Nuevas
- `ci-cd-initial-pipeline`: Cubre el pipeline inicial del repositorio para validacion, chequeos opcionales de calidad por modulo, pruebas opcionales por modulo y verificacion de build Docker.

### Capacidades Modificadas
- Ninguna.

## Impacto

- Afecta la configuracion de workflows de GitHub Actions bajo `.github/workflows/`.
- Usa los Dockerfiles existentes en `backend/` y `frontend/`.
- Usa el archivo Docker Compose existente en `opsx/docker-compose.yml`.
- No cambia APIs de aplicacion, comportamiento en runtime ni despliegue productivo.
