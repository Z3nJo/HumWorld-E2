# ADR-000: Arquitectura en capas

## Estado

Aceptada

## Contexto

HumWorld debe capturar noticias RSS, procesarlas, persistir resultados y presentar dashboards interactivos. El enunciado solicita separacion clara entre presentacion, logica de negocio y datos.

## Decision

Se adopta una arquitectura en capas:

- Capa de presentacion: aplicacion web y dashboards.
- Capa de logica de negocio: captura RSS, analisis de sentimiento, calculo de humor, configuracion y purgado.
- Capa de datos: persistencia de fuentes RSS, noticias, diccionario y parametros del sistema.

El backend expondra una API REST bajo `/api/v1`. El frontend consumira dicha API para visualizar y administrar la informacion.

## Consecuencias

- Backend y frontend pueden desarrollarse de forma separada.
- La logica de negocio queda aislada de la interfaz.
- Se facilita la escritura de pruebas unitarias e integracion.
- La contenerizacion con Docker puede separar servicios por responsabilidad.
