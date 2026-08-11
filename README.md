# HumWorld

HumWorld es una aplicacion web para analizar el "humor" del mundo a partir de noticias publicadas en fuentes RSS. El sistema capturara noticias, calculara un valor de sentimiento y mostrara resultados globales y regionales mediante dashboards.

## Objetivo

Desarrollar una aplicacion funcional que permita:

- Capturar noticias desde fuentes RSS publicas.
- Analizar texto en espanol e ingles.
- Persistir noticias, fuentes, diccionario y configuracion.
- Exponer una API REST bajo `/api/v1`.
- Visualizar resultados mediante mapa mundial, nube de palabras y listado de noticias influyentes.
- Mantener documentacion tecnica y funcional dentro de `/docs`.

## Estructura del proyecto

```text
humworld/
  backend/              API REST y logica de negocio
  frontend/             Interfaz web y dashboards
  docs/                 Documentacion, ADRs, UML y planificacion
  opsx/                 Docker Compose y configuracion de entorno
  .github/workflows/    Automatizacion CI/CD
```

## Entorno Docker base

Desde la carpeta `opsx`:

```bash
docker compose up --build
```

En Sprint 0 los contenedores son esqueletos vacios. El objetivo es comprobar que Docker Compose puede levantar backend y frontend sin errores.

Para detener el entorno:

```bash
docker compose down
```

## API prevista

La API usara JSON y la base `/api/v1`.

Endpoints minimos previstos:

- `/sources`: gestion de fuentes RSS.
- `/news`: consulta y purgado de noticias.
- `/dictionary`: gestion del diccionario de palabras evaluables.
- `/config`: parametros generales del sistema.
- `/sentiment`: analisis puntual de texto.
- `/dashboards`: datos agregados para visualizaciones.

## Documentacion

La documentacion del proyecto se mantendra en `docs/`:

- `docs/adr/`: decisiones de arquitectura.
- `docs/uml/`: diagramas principales.
- `docs/sprints/`: planificacion y seguimiento.
- `docs/definition-of-done.md`: Definition of Done del equipo.

## Estado

Sprint 0: repositorio base, estructura inicial, ADR-000, Docker Compose base y CI inicial.
