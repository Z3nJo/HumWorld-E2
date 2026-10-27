# ADR-002 — Criterio de "noticia influyente"

| Campo | Valor |
|---|---|
| **ID** | ADR-002 |
| **Título** | Criterio de "noticia influyente": mayor valor absoluto de humor dentro del filtro seleccionado, limitado a las 10 primeras |
| **Estado** | Aceptado — aprobado el 19 de octubre de 2026 (tarea `ADR-002` cerrada en Jira, HUM-38) |
| **Fecha de redacción** | 16 de octubre de 2026 |
| **Sprint** | Sprint 3 |
| **Autor / responsable** | Matías Santos — Arquitectura y Documentación |
| **Decisores** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Tarea asociada** | `ADR-002` |
| **Depende de** | `ADR-000` (arquitectura en tres capas), `ADR-001` (algoritmo de cálculo del humor), `MOD-01` (modelo E/R inicial) |
| **Decisiones que formaliza** | `D-05`, `D-06` (Planificación de Sprints v2, secc. 2) |
| **Artefactos dependientes** | `E3-H02` (listado de noticias influyentes), `T-DASH-01` (endpoints agregados), funcionalidad `news` de `ADR-004` |
| **Plantilla** | MADR extendido — formato común obligatorio para todos los ADR del proyecto |
| **Ubicación** | `docs/adr/ADR-002-criterio-noticia-influyente.md` (repositorio `HumWorld-E2`) |

> **Criterio de finalización aplicable:** *"ADR aprobado antes de iniciar E3-H02"*. Si no se aprueba dentro del Sprint 3, `E3-H02` se pospone íntegramente al Sprint 4 con alcance reducido al top 10 sin filtros avanzados (nota del Backlog Definitivo).

> **Aclaración de origen (Planificación de Sprints v2, secc. 2):** `D-05` y `D-06` son **decisiones propias del equipo**. La especificación exige un listado de "noticias más influyentes" filtrable por continente y país (secc. 4.3.2), pero no define qué hace influyente a una noticia ni cuántas se muestran. El Backlog Definitivo marcaba este punto como pendiente. Este ADR existe para que esa definición quede justificada y sea auditable.

---

## 1. Contexto y planteamiento del problema

El dashboard de HumWorld muestra, junto al mapa y a la nube de palabras, un listado de las noticias que más pesan en el humor de una región y un periodo (Especificación, secc. 4.3.2). La especificación no dice qué significa "influyente".

`ADR-001` dejó tres hechos fijados que condicionan la respuesta:

1. Cada noticia evaluable tiene un `valor_humor` en `[-1, +1]`, persistido en `NOTICIA` con tres decimales (`NUMERIC(4,3)`).
2. Ese valor es un **promedio ponderado** de los términos reconocidos, por lo que no crece con la longitud del texto.
3. Su secc. 9, punto abierto 3, pidió expresamente a este ADR que decida si la influencia debe ponderar también el **volumen de evidencia** (cuántos términos cargados contiene la noticia), porque el promedio ya no lo refleja.

El problema a resolver es:

> ¿Con qué criterio se ordenan las noticias para decidir cuáles son las más influyentes de un filtro dado, cuántas se muestran, cómo se resuelven los empates y qué noticias quedan fuera, de modo que el listado sea coherente con el valor que pinta el mapa?

### 1.1 Restricciones de partida

| # | Restricción | Fuente |
|---|---|---|
| C-01 | El listado debe poder filtrarse **por continente y por país**, además de por periodo. | Especificación, secc. 4.3.1 y 4.3.2 |
| C-02 | `valor_humor` vive en `[-1, +1]`; el signo indica mal o buen humor y el valor absoluto, la intensidad. | `ADR-001`, secc. 3.2 y 4.2 |
| C-03 | Solo las **noticias evaluables** (`valor_humor IS NOT NULL`) entran en cualquier cálculo; un nulo no es neutralidad. | `ADR-001`, secc. 4.1 y regla H-2 |
| C-04 | La ventana temporal se aplica sobre `NOTICIA.fecha_registro`. | `ADR-001`, regla H-4 |
| C-05 | El continente y el país se obtienen navegando `NOTICIA → FUENTE_RSS → CANAL`. | `MOD-01`, regla R-M4; `ADR-001`, regla H-3 |
| C-06 | La presentación no contiene reglas de negocio: el criterio de influencia se resuelve en el backend. | `ADR-000`, secc. 4.1; `ADR-004`, C-1 |
| C-07 | La especificación prohíbe el *web scraping*. No hay datos de alcance, visitas ni interacción de las noticias. | Especificación, secc. 3 y 4.2.1 |

### 1.2 Alcance de este ADR

**Incluye:** la métrica de influencia (`D-05`), el número de noticias mostradas (`D-06`), qué noticias son candidatas, cómo se aplican los filtros, el desempate y el contrato mínimo de la respuesta.

**No incluye:**

- La fórmula de `valor_humor` → `ADR-001`.
- Los términos influyentes de la nube de palabras → `T-DASH-01` (`GET /dashboards/nube-palabras`).
- La paginación o un límite configurable por el usuario. Ver la opción 3.2-3.
- La maquetación del listado → `E3-H02`.

---

## 2. Drivers de la decisión

| # | Driver | Origen |
|---|---|---|
| D-A | **Coherencia con el mapa.** El mapa pinta el promedio de `valor_humor`. Si el listado usara otra métrica, mostraría como "más influyentes" noticias que no son las que más mueven el color que el usuario está viendo. | `ADR-001`, secc. 4.3 |
| D-B | **Sin sesgo de longitud.** `ADR-001` eligió el promedio para que una noticia con `description` larga no parezca más extrema que un titular. La métrica de influencia no debe reintroducir ese sesgo. | `ADR-001`, driver D-A |
| D-C | **Explicable al usuario.** El listado se lee sin leyenda: "las noticias con el humor más extremo, en cualquier sentido". | Especificación, secc. 4.3.2 |
| D-D | **Determinismo.** La misma consulta sobre los mismos datos devuelve el mismo listado en el mismo orden. Sin eso, las pruebas no pueden fijar el resultado y el usuario ve el listado cambiar al recargar. | Especificación, secc. 7 |
| D-E | **Coste acotado.** Una consulta ordenada con `LIMIT` sobre columnas ya persistidas, sin tablas nuevas ni migraciones, en un sprint con los dashboards completos por entregar. | Planificación v2, Sprint 3 |

---

## 3. Opciones consideradas

### 3.1 Para `D-05` — métrica de influencia

#### Opción 1 — Valor absoluto de `valor_humor` *(elegida)*

`influencia(n) = |valor_humor(n)|`

- **A favor:** es la misma magnitud que pinta el mapa (D-A); independiente de la longitud (D-B); se explica en una frase (D-C); se resuelve con un `ORDER BY ABS(valor_humor)` sobre una columna existente (D-E). Mezcla noticias positivas y negativas, que es lo que pide "influyente": la intensidad, no la dirección.
- **En contra:** no distingue una noticia con un único término extremo de otra con quince términos del mismo valor (consecuencia 5.2 de `ADR-001`). Es probable que haya varias noticias con `|valor_humor| = 1,000` en un mismo filtro. Se trata con el desempate (secc. 4.3) y se registra como riesgo (secc. 5.3).

#### Opción 2 — Valor absoluto de la suma de aportes

`influencia(n) = |Σ aporte_humor(n, t)|`, leída de `NOTICIA_TERMINO`.

- **A favor:** recupera la intensidad acumulada que el promedio pierde, que es justo lo que señaló `ADR-001`.
- **En contra:** **reintroduce el sesgo de longitud** que `ADR-001` eliminó (D-B): las noticias con resumen largo dominarían el listado por tener más palabras, no más carga. Además el listado dejaría de corresponder con el mapa (D-A) y obliga a un *join* y una agregación sobre `NOTICIA_TERMINO`. **Descartada.**

#### Opción 3 — Valor absoluto ponderado por volumen de evidencia

`influencia(n) = |valor_humor(n)| · f(O(n))`, con `O(n)` el total de ocurrencias y `f` creciente y saturada (por ejemplo, `min(O(n), k) / k`).

- **A favor:** responde directamente al punto abierto 3 de `ADR-001`: una noticia extrema con más evidencia léxica sube.
- **En contra:** introduce una función y un parámetro `k` que nadie ha validado con datos reales, y `ADR-001` (regla P-2) exige no añadir parámetros sin una razón medida. La métrica ya no se explica en una frase (D-C). **Descartada por ahora**; es la vía de revisión si el riesgo R-1 (secc. 5.3) se confirma.

#### Opción 4 — Alcance o popularidad de la noticia

Ordenar por visitas, comparticiones o relevancia del medio.

- **En contra:** el sistema no tiene esos datos y no puede obtenerlos sin *scraping* (C-07). **Descartada por inviable.**

#### Opción 5 — Dos listados separados: más positivas y más negativas

- **A favor:** garantiza que se vean ambos extremos aunque uno domine.
- **En contra:** contradice el enunciado de `D-05` ("mayor valor absoluto") y duplica el espacio en el dashboard. El signo ya se ve en cada fila. **Descartada.**

### 3.2 Para `D-06` — número de noticias mostradas

#### Opción 1 — Top 10 fijo *(elegida)*

- **A favor:** cabe en el panel del dashboard sin paginación; consulta con `LIMIT 10`; contrato simple sin parámetro de cantidad.
- **En contra:** el usuario no puede pedir más. Aceptable: el listado señala lo más destacado, no sustituye una búsqueda de noticias.

#### Opción 2 — Límite configurable en `CONFIGURACION`

- **En contra:** un parámetro más sin necesidad demostrada (`ADR-001`, P-2). El valor no cambia el criterio, solo la longitud. **Descartada.**

#### Opción 3 — Paginación o parámetro `limite` en la API

- **En contra:** amplía el contrato y la interfaz más allá de `E3-H02`. **Descartada**; se puede añadir sin cambiar este criterio si aparece la necesidad.

---

## 4. Decisión

**Se adoptan las opciones 3.1-1 y 3.2-1.** Se confirman `D-05` y `D-06` tal como fueron enunciadas en la planificación, con las precisiones normativas que siguen.

### 4.1 Definiciones normativas

| Término | Definición |
|---|---|
| **Filtro seleccionado** | Combinación de ventana temporal `[fecha_desde, fecha_hasta]` (obligatoria, días completos en UTC), `continente` (opcional) y `pais` (opcional, código de dos letras, exige `continente`). Es el mismo filtro que usan los demás endpoints de `/dashboards`. |
| **Noticia candidata** | Noticia evaluable (`valor_humor IS NOT NULL`, C-03) cuya `fecha_registro` cae en `[fecha_desde 00:00 UTC, fecha_hasta + 1 día 00:00 UTC)` y cuyo canal pertenece al continente y país del filtro, si se indicaron (C-04, C-05). |
| **Noticia representante** | La candidata que representa una URL exacta dentro del filtro: la de `fecha_registro` más antigua; a igual fecha, la de menor `id_noticia`. |
| **Influencia** | `|valor_humor(n)|`, en `[0, 1]`, sobre el valor persistido con tres decimales. |
| **Noticia influyente** | Cada una de las, como máximo, 10 primeras noticias representantes según el orden de la secc. 4.3. |

### 4.2 Reglas normativas

- **I-1 — Solo noticias evaluables.** Una noticia sin términos reconocidos no es candidata, ni siquiera con influencia 0.
- **I-2 — Positivas y negativas compiten juntas.** El orden usa el valor absoluto; el signo se devuelve en la respuesta para que el frontend lo represente (color o etiqueta), sin reordenar.
- **I-3 — Máximo 10.** La deduplicación por URL se resuelve antes del límite. Si hay menos de 10 noticias representantes, se devuelven todas; si no hay ninguna, la lista va vacía; no es un error.
- **I-4 — Filtro geográfico estricto.** Con `pais`, solo cuentan las noticias de canales con ese país. Las noticias de canales con `pais` nulo solo aparecen cuando no se filtra por país (igual que `ADR-001`, regla H-3).
- **I-5 — El criterio vive en el backend.** El frontend muestra el listado en el orden recibido y no recalcula ni reordena (C-06).
- **I-6 — Instantánea.** Como `valor_humor` no se recalcula al editar el diccionario (`ADR-001`, regla H-7), el listado de un periodo pasado es estable.

### 4.3 Orden y desempate

Primero, sobre las candidatas ya filtradas, se selecciona una representante por cada valor exacto de `url`:

```
PARTITION BY url
ORDER BY     fecha_registro ASC,  -- primera captura de la URL
             id_noticia     ASC   -- desempate de representación
```

Después, las representantes se ordenan y limitan:

```
ORDER BY  ABS(valor_humor)  DESC,   -- influencia
          fecha_registro    DESC,   -- a igual influencia, la más reciente
          id_noticia        ASC     -- desempate final, garantiza orden total
LIMIT 10
```

La primera fase evita que una misma URL ocupe más de una posición, sin alterar la trazabilidad de sus capturas por fuente. En la segunda, el criterio de influencia conserva la semántica original: a igual influencia se favorece la noticia más reciente, y `id_noticia` solo garantiza un orden total y determinista (D-D).

### 4.4 Contrato de la respuesta

`GET /api/v1/dashboards/noticias-influyentes?fecha_desde=…&fecha_hasta=…[&continente=…][&pais=…]`

La respuesta repite el filtro aplicado y devuelve `noticias`, ordenadas según la secc. 4.3. Cada elemento incluye como mínimo: `id_noticia`, `titulo`, `url`, `canal`, `continente`, `pais`, `fecha_registro` y `valor_humor` **con signo**. Los errores de validación del filtro devuelven `400`, igual que el resto de la API.

### 4.5 Ubicación en la arquitectura

La selección de representantes, el orden y el límite se ejecutan en la consulta del repositorio (`DashboardRepository.influential_news`) para que PostgreSQL devuelva solo 10 filas, en lugar de cargar candidatas en memoria. El servicio valida el filtro y el repositorio aplica la selección y el orden que fija este ADR. Respeta `ADR-000` (el servicio no consulta la base de datos; el repositorio no decide qué filtro es válido).

---

## 5. Consecuencias

### 5.1 Positivas

- Cierra `D-05` y `D-06` y desbloquea `E3-H02`.
- El listado y el mapa miden lo mismo: las noticias que encabezan el listado son las que más empujan el promedio de su región.
- No requiere tablas, columnas, parámetros ni migraciones: una consulta ordenada sobre `NOTICIA`, `FUENTE_RSS` y `CANAL`.
- El orden total hace el resultado reproducible y comprobable en pruebas de integración.
- Responde al punto abierto 3 de `ADR-001`: se decide **no** ponderar por volumen de evidencia por ahora, con la vía de revisión identificada (opción 3.1-3).

### 5.2 Negativas y costes asumidos

- **Una noticia con un único término extremo puede encabezar el listado.** Un titular con solo "guerra" (`-9`) obtiene `-0,900` y supera a una noticia con diez términos de `-8` (`-0,800`). Es el coste de no reintroducir el sesgo de longitud.
- **Empates frecuentes en los extremos.** Con tres decimales y un diccionario de valores enteros, varias noticias pueden compartir `|valor_humor| = 1,000`. El desempate por fecha decide entre ellas, no su contenido.
- **Sin control de cantidad para el usuario.** Diez es fijo.

### 5.3 Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | **El listado se llena de titulares con una sola palabra cargada**, poco representativos del periodo. | Medio | Revisarlo con datos reales en la validación de `E3-H02`: contar cuántas de las 10 primeras tienen una sola ocurrencia reconocida. Si son mayoría de forma sistemática, revisar este ADR hacia la opción 3.1-3. |
| R-2 | **Pocas noticias en el filtro** (un país con 3 noticias) producen un "top" poco significativo. | Bajo | La lista solo devuelve las candidatas que existen (I-3). El dashboard ya muestra el número de noticias del agregado (`ADR-001`, secc. 4.3.3), que da el contexto. |
| R-3 | **Rangos de fecha amplios** encarecen el orden por `ABS(valor_humor)`, que no usa índice. | Bajo | El filtro por `fecha_registro` y geografía reduce las filas antes de ordenar, y `LIMIT 10` permite a PostgreSQL usar *top-N sort*. Medir antes de añadir un índice de expresión. |
| R-4 | **El frontend reordena o filtra el listado** y rompe la coherencia con el backend. | Bajo | Regla I-5 y criterio C-V5. |

---

## 6. Cumplimiento y verificación

| # | Criterio verificable | Mecanismo |
|---|---|---|
| C-V1 | Las noticias se devuelven ordenadas por `|valor_humor|` descendente, mezclando positivas y negativas. | Prueba de integración contra PostgreSQL |
| C-V2 | A igual `|valor_humor|`, la más reciente por `fecha_registro` va primero; a igual fecha, la de menor `id_noticia`. | Prueba de integración |
| C-V3 | Nunca se devuelven más de 10 noticias; con menos candidatas se devuelven todas; sin candidatas, lista vacía y `200`. | Prueba de integración |
| C-V4 | Las noticias con `valor_humor` nulo, fuera de la ventana o de otro continente o país no aparecen. | Prueba de integración |
| C-V5 | El frontend muestra las noticias en el orden recibido, con el signo visible. | Prueba de componente de `E3-H02` |
| C-V6 | El endpoint y su respuesta están documentados en `/api/docs` y en los contratos de `opsx/`. | Revisión de *pull request*; `sync_contracts.py --check` en CI |

Estos criterios se incorporan a la verificación de `E3-H02`.

---

## 7. Trazabilidad

| Elemento de este ADR | Origen |
|---|---|
| Listado de noticias más influyentes con filtros por continente y país | Especificación, secc. 4.3.1 y 4.3.2 |
| Prohibición de *scraping* (sin datos de alcance) | Especificación, secc. 3 y 4.2.1 |
| Rango `[-1, +1]`, noticias evaluables, `fecha_registro`, geografía por navegación | `ADR-001`, secc. 4.1, reglas H-2, H-3, H-4 |
| Punto abierto sobre volumen de evidencia | `ADR-001`, secc. 5.2 y secc. 9, punto 3 |
| Reglas de negocio fuera de la presentación | `ADR-000`, secc. 4.1; `ADR-004`, C-1 |
| `D-05` mayor valor absoluto de humor, `D-06` top 10 | Planificación de Sprints v2, secc. 2 — **decisiones adoptadas por el equipo** |
| Reglas I-1 a I-6, desempate y contrato de respuesta | **Decisión del equipo adoptada en este ADR** |

---

## 8. Supuestos, verificaciones y puntos abiertos

1. **Observación de proceso.** El endpoint `GET /api/v1/dashboards/noticias-influyentes` y su consumo en el frontend ya están en `main` (PR #66, commit `f35c3a9`), con el orden y el límite que fija la secc. 4.3. Este ADR **ratifica** esa implementación; no exige cambios de código. La implementación se adelantó a la aprobación del ADR, al contrario de lo previsto en la Planificación v2. `E3-H02` no debe darse por terminada hasta que este ADR esté aprobado.
2. **Pruebas pendientes.** A la fecha de redacción, `backend/tests/test_dashboards_postgresql.py` y `backend/tests/test_dashboard_evolution.py` cubren el orden por valor absoluto, la ventana UTC, los nulos y los filtros (C-V1, C-V4). **No hay prueba del desempate (C-V2) ni del límite de 10 (C-V3).** Deben añadirse antes de cerrar `E3-H02`. Seguimiento: issue #67.
3. **Seguimiento reabierto — duplicados entre fuentes.** La unicidad de `NOTICIA` se mantiene en `(id_fuente, guid_origen)`, no en la URL. El 16 de octubre de 2026 se consultaron inicialmente las capturas presentes en PostgreSQL mediante:

   ```sql
   SELECT url, COUNT(*) AS total
   FROM noticia
   WHERE url IS NOT NULL
   GROUP BY url
   HAVING COUNT(*) > 1
   ORDER BY total DESC, url;
   ```

   La consulta devolvió **0 filas** en esa instantánea. Posteriormente, una reproducción controlada creó dos noticias evaluables de fuentes distintas con la URL `https://example.test/noticia-duplicada-prueba`, `valor_humor = -1,000` y fechas de registro `2026-10-10` e `2026-10-12`. El endpoint devolvió ambas filas en el listado, con la más reciente primero conforme al desempate de la secc. 4.3. Por tanto, issue #68 queda **reabierto**.

   **Decisión:** el listado deduplicará por el valor exacto de `url` después de aplicar el rango y los filtros geográficos. Para cada URL conservará la noticia con `fecha_registro` más antigua; a igual fecha, la de menor `id_noticia`. Sobre esas representantes aplicará el orden de la secc. 4.3 y `LIMIT 10`. Esta regla no cambia la unicidad de captura ni elimina filas de `NOTICIA`; solo evita que un artículo ocupe varios puestos del ranking. La igualdad de URL es textual: no se normalizan parámetros, redirecciones ni mayúsculas.

---

## 9. Referencias

1. Especificación del Proyecto Final **HumWorld — ¿De qué humor está el mundo?**, Universidad Andrés Bello, curso 2026-27 (secc. 3, 4.2.1, 4.3.1, 4.3.2, 7).
2. **ADR-000 — Arquitectura en tres capas**, secc. 4.1.
3. **ADR-001 — Algoritmo de cálculo del humor**, secc. 4.1 a 4.5, 5.2 y 9.
4. **ADR-004 — Arquitectura interna del frontend**, restricción C-1 y funcionalidad `news`.
5. **MOD-01 — Modelo E/R inicial**, regla R-M4 y secc. 8, decisión abierta 2.
6. **Planificación de Sprints HumWorld v2** — secc. 2 (decisiones `D-05` y `D-06`).
7. **Backlog Definitivo HumWorld** — épica 3, historia `E3-H02`.

---

## 10. Historial de revisiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 1.2 | 2026-10-16 | Matías Santos | Se reabre issue #68 tras reproducción controlada de dos fuentes con la misma URL en el ranking. Se decide deduplicar por URL exacta dentro del filtro, conservando la captura más antigua y, a igual fecha, el menor identificador; el orden y límite se aplican después. |
| 1.1 | 2026-10-16 | Matías Santos | Verificación de issue #68: la consulta de URLs repetidas en las capturas PostgreSQL devolvió 0 filas. Se cierra el seguimiento como no reproducido; no se modifica la unicidad de captura ni el ranking. |
| 1.0 | 2026-10-16 | Matías Santos | Redacción inicial. Formaliza `D-05` y `D-06`; fija candidatas, filtro, orden con desempate, límite de 10, contrato de respuesta y reglas I-1 a I-6. Responde al punto abierto 3 de `ADR-001`. Estado: **Propuesto**. |
| 1.1 | 2026-10-19 | Matías Santos | Cambio de estado a **Aceptado** al cerrar la tarea `ADR-002` (HUM-38) en el Sprint 3. Sin cambios en la decisión; los puntos abiertos de la secc. 8 siguen vigentes (issues #67 y #68). |
