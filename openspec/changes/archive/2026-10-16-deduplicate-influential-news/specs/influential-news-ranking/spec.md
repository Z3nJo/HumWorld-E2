## Purpose

Garantizar que el listado de noticias influyentes represente artículos distintos aunque hayan sido capturados por fuentes RSS diferentes.

## ADDED Requirements

### Requirement: Una representante por URL en el ranking

El sistema SHALL deduplicar por el valor exacto de `NOTICIA.url` las noticias evaluables que cumplen el rango temporal y los filtros geográficos de `GET /api/v1/dashboards/noticias-influyentes`. SHALL conservar como representante de cada URL la noticia con `fecha_registro` más antigua; si dos candidatas de la misma URL tienen la misma fecha, SHALL conservar la de menor `id_noticia`.

#### Scenario: Consolidar una noticia publicada por dos fuentes

- **WHEN** dos noticias evaluables de fuentes distintas coinciden en el filtro y tienen la misma URL, con fechas de registro distintas
- **THEN** la respuesta contiene una sola de esas noticias
- **AND** su `id_noticia` corresponde a la fecha de registro más antigua

#### Scenario: Desempatar representantes con la misma fecha

- **WHEN** dos noticias evaluables con la misma URL y la misma fecha de registro coinciden en el filtro
- **THEN** la respuesta conserva la de menor `id_noticia`

#### Scenario: Mantener candidatas de URLs distintas

- **WHEN** dos noticias evaluables coinciden en el filtro pero tienen URLs distintas
- **THEN** ambas continúan siendo candidatas para el ranking

### Requirement: Orden y límite después de deduplicar

El sistema MUST aplicar el orden por `ABS(valor_humor)` descendente, `fecha_registro` descendente e `id_noticia` ascendente sobre las representantes deduplicadas. SHALL aplicar el límite fijo de 10 después de esa ordenación.

#### Scenario: No desperdiciar puestos del top 10 en duplicados

- **WHEN** existen más de diez filas candidatas pero algunas comparten URL
- **THEN** la respuesta contiene como máximo diez URLs distintas
- **AND** incluye las representantes de mayor influencia disponibles hasta completar el límite

### Requirement: Deduplicación limitada al ámbito consultado

La deduplicación SHALL ejecutarse después de aplicar las condiciones de rango temporal, continente y país. Las filas que no coinciden con el filtro MUST NOT elegir ni desplazar a la representante de una URL dentro del filtro.

#### Scenario: Ignorar una captura más antigua fuera del rango

- **WHEN** una URL tiene una noticia más antigua fuera del rango y otra dentro del rango solicitado
- **THEN** la noticia dentro del rango puede representar esa URL en la respuesta
