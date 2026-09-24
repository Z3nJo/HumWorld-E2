# ADR-001 — Algoritmo de cálculo del humor

| Campo | Valor |
|---|---|
| **ID** | ADR-001 |
| **Título** | Algoritmo de cálculo del humor: promedio ponderado de términos reconocidos, normalizado a [-1, 1], y agregación geográfica por promedio de noticias |
| **Estado** | Aceptado — acordado por el equipo el 22 de septiembre de 2026 |
| **Fecha de redacción** | 22 de septiembre de 2026 |
| **Sprint** | Sprint 2 |
| **Autor / responsable** | Matías Santos — Arquitectura y Documentación |
| **Decisores** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Tarea asociada** | `ADR-001`, épica `EP-2`, 3 puntos de historia |
| **Depende de** | `ADR-000` (arquitectura en tres capas), `ADR-003` (stack tecnológico), `MOD-01` (modelo E/R inicial) |
| **Decisiones que formaliza** | `D-02`, `D-03`, `D-04` (Planificación de Sprints v2, secc. 2) |
| **Artefactos dependientes** | `E2-H02` (cálculo y persistencia del humor por noticia), `E2-H03` (soporte ES/EN), `E2-H04` (`POST /sentiment`), `T-DASH-01` (endpoints agregados), `E3-H01` (mapa mundial), `E3-H02` (noticias influyentes, vía `ADR-002`), `QA-S2`, `INT-S2` |
| **Plantilla** | MADR extendido — formato común obligatorio para todos los ADR del proyecto |
| **Ubicación** | `docs/adr/ADR-001-algoritmo-calculo-humor.md` (repositorio `HumWorld-E2`) |

> **Criterio de finalización aplicable (Planificación de Sprints v2, tabla detallada, fila S2/ADR-001):** *"ADR aprobado **antes de dar por completada E2-H02**; documenta fórmula, rango y justificación"*. **Cumplido:** revisado y acordado por los cuatro integrantes el 22 de septiembre de 2026. `E2-H02` queda desbloqueada para su cierre, con la salvedad del protocolo de validación de la secc. 7 (criterio C-V9).

> **Aclaración de origen (Planificación de Sprints v2, secc. 2, aclaración obligatoria):** las decisiones `D-02`, `D-03` y `D-04` son **decisiones propias del equipo**, no derivadas literalmente de la especificación. La especificación solo propone una suma como ejemplo y autoriza expresamente otra fórmula (secc. 10.4). Este ADR existe precisamente para que esa desviación quede justificada y sea auditable.

---

## 1. Contexto y planteamiento del problema

HumWorld asigna a cada noticia capturada un valor de "humor" mediante un algoritmo de análisis de sentimiento y publica ese valor agregado por continente y país en un mapa mundial (Especificación, secc. 4.2.4 y 4.3.2).

La especificación fija dos cosas y deja abierta una tercera:

1. **Fija** la escala del diccionario: cada palabra tiene un valor de -10 (mal humor) a +10 (muy buen humor) — secc. 10.4. El equipo la adoptó formalmente como `D-01`.
2. **Propone** una forma de combinar esos valores —"sumando los valores de las palabras evaluables que contiene la noticia"— y acto seguido declara: *"Esta es solo una posible solución. Cada equipo puede determinar otra manera de hacer análisis de sentimiento."*
3. **No dice nada** sobre cómo se obtiene el humor de un continente o de un país a partir del humor de sus noticias, pese a exigir el mapa mundial de la secc. 4.3.2.

El equipo adoptó en la planificación tres decisiones que cierran esos huecos (`D-02`, `D-03`, `D-04`) pero que, por ser propias, quedaron señaladas como pendientes de formalizar en este ADR antes de poder cerrar `E2-H02`.

El problema a resolver es, por tanto:

> ¿Con qué fórmula exacta se calcula el valor de humor de una noticia a partir de los términos del diccionario que contiene, en qué rango vive ese valor, cómo se agrega por continente y país, y qué pasa en los casos límite —noticia sin términos reconocidos, región sin noticias— de modo que el resultado sea comparable entre noticias de distinta longitud y entre regiones de distinto volumen?

### 1.1 Restricciones de partida (no negociables)

| # | Restricción | Fuente |
|---|---|---|
| C-01 | Los términos del diccionario tienen valores en el rango **-10 a +10**. | Especificación, secc. 10.4; `D-01` |
| C-02 | El valor de humor de cada noticia **se persiste junto a la propia noticia**. | Especificación, secc. 4.2.4 |
| C-03 | El análisis debe funcionar en **español e inglés**. | Especificación, secc. 3 y 4.4; `E2-H03` |
| C-04 | El mapa muestra el humor **por continente**, en un momento del tiempo elegible por el usuario dentro del rango con información disponible. | Especificación, secc. 4.3.2 |
| C-05 | La nube de palabras y el listado de influyentes deben poder filtrarse **por continente y por país**. | Especificación, secc. 4.3.1 y 4.3.2 |
| C-06 | El endpoint `POST /sentiment` analiza un texto suelto y devuelve **su valor de humor**, bajo el mismo algoritmo del sistema. | Especificación, secc. 10.2; `E2-H04` |
| C-07 | El motor de sentimiento debe ejecutarse en **pruebas unitarias sin base de datos ni servidor HTTP**, con cobertura ≥ 80 %. | Especificación, secc. 7; `ADR-000`, R-4; `ADR-003`, S-2 |
| C-08 | `NOTICIA.valor_humor` debe ser **coherente con los `aporte_humor`** de las filas de `NOTICIA_TERMINO` de esa noticia, según la fórmula que fije este ADR. | `MOD-01`, regla R-M7 |
| C-09 | El continente y el país de una noticia se obtienen **por navegación** `NOTICIA → FUENTE_RSS → CANAL`; no se duplican en `NOTICIA`. | `MOD-01`, regla R-M4 |
| C-10 | La fórmula **no está validada con datos reales**; debe validarse con un conjunto de noticias reales y **dejarse parametrizable**. | Planificación v2, secc. de riesgos, fila "Complejidad del algoritmo de humor" |

### 1.2 Alcance de este ADR

**Incluye:** la definición de "término reconocido", la fórmula de cálculo del humor por noticia (`D-02`), su normalización y rango (`D-03`), la fórmula de agregación geográfica (`D-04`), el tratamiento de los casos límite, los parámetros configurables que hacen la fórmula ajustable sin cambio de código, la precisión y el redondeo, y el protocolo de validación con datos reales exigido por C-10.

**No incluye (se difiere explícitamente):**

- El criterio de **"noticia influyente"** y el número de noticias a mostrar → `ADR-002` (`D-05`, `D-06`).
- La **tokenización, lematización y detección de idioma** concretas, y la construcción del diccionario en ambos idiomas → `E2-H03`. Este ADR solo fija qué cuenta como término reconocido a efectos de la fórmula.
- La **escala cromática del mapa** y la representación visual de la incertidumbre → `E3-H01` y `T-DASH-01`. Este ADR deja constancia del requisito en la secc. 5.3.
- Cualquier motor de sentimiento **basado en LLM**. La especificación lo autoriza como alternativa (secc. 2, objetivo 2), pero el diccionario es la vía elegida por el equipo desde el Backlog y sostiene la épica `EP-2` completa.

---

## 2. Drivers de la decisión

| # | Driver | Origen |
|---|---|---|
| D-A | **Comparabilidad entre noticias de distinta longitud.** El agregado geográfico (`D-04`) promedia valores de noticias que van del titular suelto al resumen largo. Si el valor por noticia depende de cuántas palabras tiene, el promedio por continente mide longitud de texto tanto como sentimiento. | Consecuencia directa de `D-04` + Especificación, secc. 4.3.2 |
| D-B | **Rango acotado y conocido de antemano.** El mapa necesita una escala fija para pintar colores; el listado de influyentes (`ADR-002`) necesita un valor absoluto comparable entre regiones y fechas. Un rango que dependa de los datos obliga a recalcular la escala en cada consulta. | Especificación, secc. 4.3.2; `ADR-002` |
| D-C | **Auditabilidad del cálculo.** `MOD-01` persiste `NOTICIA_TERMINO.aporte_humor` precisamente para poder explicar por qué una noticia obtuvo su valor. La fórmula debe poder reconstruirse desde esas filas. | `MOD-01`, secc. 4.6 y R-M7 (C-08) |
| D-D | **Testabilidad en memoria.** Una fórmula cerrada sobre una lista de pares (valor, ocurrencias) se prueba con tablas de casos sin base de datos, que es la condición que hace alcanzable el 80 % de cobertura. | Especificación, secc. 7; `ADR-000`, R-4 (C-07) |
| D-E | **Reversibilidad barata ante la validación pendiente.** La fórmula se aprueba **antes** de contrastarla con noticias reales (C-10). La decisión debe poder ajustarse tras esa validación sin tocar código ni esquema. | Planificación v2, riesgos (C-10) |
| D-F | **Capacidad del equipo en el Sprint 2.** El Sprint 2 suma 35 puntos y `E2-H02` es la historia más cara (8 puntos). La complejidad del algoritmo compite directamente con la entrega del resto de la épica. | Planificación v2, secc. 1.2, 1.3 y plan de carga de Jira |
| D-G | **Correspondencia con la unidad de aprendizaje.** El objetivo específico 2 de la especificación exige un algoritmo de análisis de sentimiento **justificado**, no simplemente implementado. | Especificación, secc. 2, objetivo específico 2 |

---

## 3. Opciones consideradas

Las tres decisiones se analizan por separado porque son independientes: se puede elegir suma y normalizar igual, o promediar y agregar de otra forma.

### 3.1 Para `D-02` — combinación de los términos de una noticia

Notación: una noticia `n` contiene términos reconocidos `t ∈ T(n)`, cada uno con valor de diccionario `v_t ∈ [-10, +10]` y número de ocurrencias `o_t ≥ 1`.

#### Opción 1 — Suma de valores (la que propone la especificación como ejemplo)

`S(n) = Σ o_t · v_t`

- **A favor:** es literalmente el ejemplo de la secc. 10.4; implementación trivial; conserva la intuición de "cuanto más contenido negativo, más negativa la noticia".
- **En contra:** **el resultado crece con la longitud del texto.** Una noticia larga con términos tibios supera en valor absoluto a un titular con una palabra extrema. Como `D-04` promedia noticias entre sí, ese sesgo se propaga al mapa: un continente cuyos feeds publican `description` larga aparece más extremo que otro cuyos feeds solo publican titular, sin que el sentimiento tenga nada que ver. Y el rango no está acotado a priori, lo que rompe D-B. **Descartada como fórmula por defecto; se conserva como alternativa configurable acotada (secc. 4.4).**

#### Opción 2 — Promedio ponderado por ocurrencias *(elegida)*

`M(n) = (Σ o_t · v_t) / (Σ o_t)`

- **A favor:** independiente de la longitud del texto (D-A); el rango queda **acotado exactamente** a `[-10, +10]` sin recurrir a constantes arbitrarias, porque es una media de valores de ese rango — lo que hace la normalización de `D-03` una división exacta y no un recorte (D-B); un término repetido pesa más que uno que aparece una sola vez, que es el comportamiento esperable; el numerador es exactamente `Σ aporte_humor`, con lo que C-08 se cumple por construcción (D-C).
- **En contra:** pierde la noción de intensidad acumulada — una noticia con veinte términos negativos y otra con uno solo, todos de valor -8, obtienen el mismo -0,8. Esa información no se pierde del todo: queda en las filas de `NOTICIA_TERMINO`, disponible para `ADR-002` si el criterio de influencia la necesita.

#### Opción 3 — Promedio simple sobre términos distintos

`M(n) = (Σ v_t) / |T(n)|`, ignorando `o_t`.

- **A favor:** aún más simple; inmune a la repetición mecánica de una palabra en un feed mal formado.
- **En contra:** trata igual un término que aparece una vez y otro que aparece ocho; desaprovecha `NOTICIA_TERMINO.ocurrencias`, que `MOD-01` ya persiste. **Descartada como defecto; conservada como alternativa configurable.**

#### Opción 4 — Diferencia normalizada de recuentos positivo/negativo

`(P - N) / (P + N)`, con `P` y `N` el número de términos positivos y negativos.

- **A favor:** rango `[-1, 1]` directo; robusta frente a valores mal calibrados del diccionario.
- **En contra:** **descarta la magnitud del diccionario**, que es justamente lo que la especificación pide mantener al definir la escala -10/+10 (C-01): "guerra" (-10) pesaría lo mismo que "retraso" (-2). Vacía de sentido la gestión del diccionario que exige la secc. 4.2.2. **Descartada por incompatibilidad con C-01.**

### 3.2 Para `D-03` — rango del valor resultante

#### Opción 1 — Conservar el rango [-10, +10] del diccionario

- **A favor:** sin transformación adicional; el valor persistido se lee con la misma escala que el diccionario.
- **En contra:** acopla el rango del resultado a un detalle del diccionario. Si el equipo decidiera más adelante pasar a una escala -5/+5, cambiarían todos los umbrales del frontend y del `ADR-002`.

#### Opción 2 — Normalizar a [-1, +1] *(elegida)*

`valor_humor(n) = M(n) / 10`

- **A favor:** rango canónico e independiente de la escala del diccionario; el signo es inmediatamente legible (negativo = mal humor, positivo = buen humor, 0 = neutro) y el valor absoluto es directamente una intensidad en tanto por uno, que es lo que consume `ADR-002`; encaja con cualquier escala cromática divergente estándar; una escala unitaria evita que el frontend tenga que conocer la escala interna del diccionario.
- **En contra:** exige un parámetro de escala (el divisor) que debe mantenerse sincronizado con el rango real del diccionario. Se resuelve declarándolo como parámetro de configuración y validándolo (secc. 4.4 y 6).

#### Opción 3 — Normalizar contra el valor observado (min-max sobre el conjunto de datos)

- **A favor:** aprovecha todo el rango de color del mapa aunque los valores reales se concentren cerca de 0.
- **En contra:** **el mismo texto obtendría valores distintos según qué otras noticias haya en la base de datos**, y el valor cambiaría retroactivamente con cada captura. Imposible de persistir junto a la noticia (C-02) y sin sentido para `POST /sentiment` (C-06). **Descartada.** El problema real que intenta resolver —la concentración de valores cerca de 0— es de **representación**, y se trata como tal en la secc. 5.3.

### 3.3 Para `D-04` — agregación por continente y país

#### Opción 1 — Promedio simple de los valores de humor de sus noticias *(elegida)*

- **A favor:** es la agregación que el usuario entiende sin explicación ("el humor de Europa es el humor medio de sus noticias"); conserva el rango `[-1, 1]` sin trabajo adicional, porque la media de valores de un intervalo vive en ese intervalo; una sola consulta agregada sobre `NOTICIA` + `FUENTE_RSS` + `CANAL` (C-09), sin tablas precalculadas.
- **En contra:** **volátil con pocas noticias.** Un continente con dos noticias produce un valor tan extremo como estadísticamente vacío, y el mapa lo pinta con la misma autoridad que uno con quinientas. Se mitiga en la secc. 4.3.3, no se oculta.

#### Opción 2 — Promedio de promedios (media de los valores por país dentro del continente)

- **A favor:** evita que un país con muchísimos feeds domine el valor de su continente.
- **En contra:** da el mismo peso a un país con 3 noticias que a uno con 300, que es un sesgo peor que el que corrige; además `CANAL.pais` es **nullable** (`MOD-01`, secc. 3.1), de modo que las noticias de agencias internacionales no pertenecerían a ningún grupo y desaparecerían del agregado continental. **Descartada.**

#### Opción 3 — Media ponderada por el número de términos reconocidos de cada noticia

- **A favor:** da más peso a las noticias sobre las que hay más evidencia léxica.
- **En contra:** reintroduce por la puerta de atrás el sesgo de longitud que `D-02` acaba de eliminar (D-A). **Descartada por incoherencia con la decisión anterior.**

---

## 4. Decisión

**Se adoptan las opciones 3.1-2, 3.2-2 y 3.3-1.** Es decir, se confirman `D-02`, `D-03` y `D-04` tal como fueron enunciadas en la planificación, con las precisiones normativas que siguen —y que son la aportación propia de este ADR, no una derivación de la especificación.

### 4.1 Definiciones normativas

| Término | Definición aplicable en todo el proyecto |
|---|---|
| **Término reconocido** | Entrada de `TERMINO` con `activo = true` cuyo `idioma` coincide con `NOTICIA.idioma` y que aparece al menos una vez en el texto analizado de la noticia. La comparación es insensible a mayúsculas y a acentos. La estrategia concreta de coincidencia (lema, forma flexionada) la fija `E2-H03`; no altera la fórmula. |
| **Texto analizado** | Concatenación de `NOTICIA.titulo` y `NOTICIA.descripcion`, separados por un espacio. Si `descripcion` es nula, solo el título. No se descarga el cuerpo del artículo: la especificación prohíbe el *web scraping* (secc. 3 y 4.2.1). |
| **Ocurrencias (`o_t`)** | Número de apariciones del término reconocido `t` en el texto analizado. Se persiste en `NOTICIA_TERMINO.ocurrencias`. |
| **Valor del término (`v_t`)** | `TERMINO.valor`, en el rango `[-10, +10]` (C-01). |
| **Aporte (`aporte_humor`)** | `aporte_humor(n, t) = o_t · v_t`. Se persiste en `NOTICIA_TERMINO.aporte_humor`, en la escala del diccionario (**sin normalizar**). |
| **Noticia analizada** | Noticia con `fecha_analisis IS NOT NULL`, con independencia de que `valor_humor` sea nulo. Ver la regla H-6. |
| **Noticia evaluable** | Noticia analizada con `valor_humor IS NOT NULL`. Son las únicas que entran en cualquier agregación. |

### 4.2 Fórmula del humor por noticia (`D-02` + `D-03`)

Sea `T(n)` el conjunto de términos reconocidos de la noticia `n`, y `E` el parámetro `humor.escala_maxima` (valor por defecto `10`, ver secc. 4.4):

```
S(n) = Σ  o_t · v_t          (suma de aportes; numerador)
      t∈T(n)

O(n) = Σ  o_t                (total de ocurrencias; denominador)
      t∈T(n)

                 S(n)
valor_humor(n) = ————————     si O(n) > 0
                 E · O(n)

valor_humor(n) = NULL         si O(n) = 0
```

**Rango garantizado.** Como `v_t ∈ [-10, +10]` y `E = 10`, cada sumando cumple `o_t·v_t ∈ [-10·o_t, +10·o_t]`, de donde `S(n) ∈ [-10·O(n), +10·O(n)]` y por tanto `valor_humor(n) ∈ [-1, +1]` **exactamente, sin recorte ni saturación**. No se aplica ningún `clamp`: si el resultado cayera fuera del rango, sería un defecto —el diccionario contiene un valor fuera de `[-10, +10]`— y debe fallar la validación, no corregirse en silencio (ver C-V3).

**Ejemplo.** Noticia en español cuyo texto analizado contiene "guerra" (`v = -9`) dos veces, "crisis" (`v = -6`) una vez y "acuerdo" (`v = +5`) una vez:

| Término | `v_t` | `o_t` | `aporte_humor` |
|---|---:|---:|---:|
| guerra | -9 | 2 | -18,00 |
| crisis | -6 | 1 | -6,00 |
| acuerdo | +5 | 1 | +5,00 |
| **Total** | | **4** | **-19,00** |

`valor_humor = -19 / (10 · 4) = -0,475`

Con la suma de la especificación el mismo texto habría dado `-19`, un número sin rango conocido y que crecería si la misma noticia trajera `description` en lugar de solo titular.

### 4.3 Fórmula del humor por continente y país (`D-04`)

#### 4.3.1 Definición

Sea `G` un ámbito geográfico —un continente, un país o el mundo entero— y `[d₁, d₂]` la ventana temporal seleccionada. Sea `N(G, d₁, d₂)` el conjunto de **noticias evaluables** cuya `FUENTE_RSS → CANAL` pertenece a `G` y cuya fecha de referencia cae en la ventana:

```
                      1
humor(G, d₁, d₂) = ——————— ·  Σ  valor_humor(n)
                    |N(G)|   n∈N(G)
```

El rango se conserva en `[-1, +1]` por ser una media de valores de ese intervalo.

#### 4.3.2 Reglas normativas de la agregación

- **H-1 — Promedio plano, no promedio de promedios.** El humor de un continente se calcula sobre **sus noticias**, no como media de los valores de sus países. Es lo que dice `D-04` literalmente y evita el sesgo descrito en la opción 3.3-2.
- **H-2 — Solo noticias evaluables.** Las noticias con `valor_humor IS NULL` —analizadas pero sin términos reconocidos, o aún sin analizar— **no entran en el denominador**. No se las cuenta como 0: un 0 es una afirmación de neutralidad que el sistema no ha hecho.
- **H-3 — Ámbito geográfico por navegación.** La pertenencia a un continente o país se resuelve `NOTICIA → FUENTE_RSS → CANAL` (C-09). Las noticias de canales con `pais` nulo **cuentan en su continente** y no aparecen en ningún agregado por país.
- **H-4 — Fecha de referencia: `fecha_registro`.** La ventana temporal se aplica sobre `NOTICIA.fecha_registro`, no sobre `fecha_publicacion`. Razón: `fecha_publicacion` es **nullable** en `MOD-01` (muchos feeds no la publican) y usarla dejaría fuera de todo agregado a las noticias sin ella. `fecha_registro` es obligatoria y es además la fecha que la especificación asocia al registro de la noticia en el sistema (secc. 4.2.4) y la que ya usa el purgado. *Esta regla no estaba decidida en ninguna fuente previa; se adopta aquí porque `D-04` es incalculable sin un eje temporal definido, y queda sujeta a confirmación de Backend y Frontend en `T-DASH-01`.*
- **H-5 — Sin agregados precalculados.** El valor se obtiene por consulta agregada en tiempo de petición, conforme a lo previsto en `MOD-01`, secc. 2. Si el rendimiento de `T-DASH-01` lo exige, la materialización se decide allí y no cambia esta fórmula.

#### 4.3.3 Tratamiento del volumen insuficiente

Toda respuesta de agregación **incluye obligatoriamente el número de noticias evaluables** sobre el que se calculó:

| Situación | Respuesta |
|---|---|
| `\|N(G)\| = 0` | `humor: null`, `noticias: 0`, `suficiente: false`. El mapa pinta la región como **sin datos**, no como neutra. |
| `0 < \|N(G)\| < humor.minimo_noticias_agregacion` | Se devuelve el valor calculado, con `noticias: <n>` y `suficiente: false`. El frontend lo señala como dato provisional. |
| `\|N(G)\| ≥ humor.minimo_noticias_agregacion` | Se devuelve el valor con `suficiente: true`. |

> **Regla H-6 — Nulo no significa "pendiente".** `MOD-01`, secc. 3.3, identifica las noticias pendientes de analizar con el predicado `valor_humor IS NULL`. Con esta decisión ese predicado deja de ser válido: una noticia analizada sin términos reconocidos tiene `valor_humor` nulo y sería reprocesada indefinidamente por el cron. **El predicado de pendiente pasa a ser `fecha_analisis IS NULL`.** No requiere cambio de esquema —`fecha_analisis` ya existe en `MOD-01`—, solo corregir la nota de la secc. 3.3 de ese documento y el índice de selección de pendientes. Ver secc. 7.

### 4.4 Parametrización exigida por C-10

La fórmula se aprueba antes de validarse con datos reales (D-E). Para que el ajuste posterior no requiera cambio de código ni migración, los tres grados de libertad de la decisión se exponen como registros de `CONFIGURACION`, que ya es una entidad clave-valor (`MOD-01`, secc. 3.5) y no necesita cambio de esquema:

| Clave | Tipo | Valor por defecto | Significado |
|---|---|---|---|
| `humor.formula_noticia` | texto | `promedio_ponderado` | Estrategia de combinación de términos. Valores admitidos: `promedio_ponderado` (opción 3.1-2, por defecto), `promedio_simple` (opción 3.1-3, ignora `o_t`), `suma_acotada` (opción 3.1-1 acotada: `clamp(S(n) / (E · humor.saturacion_suma), -1, +1)`). |
| `humor.escala_maxima` | decimal | `10` | Divisor de normalización `E`. Debe coincidir con el valor absoluto máximo admitido en `TERMINO.valor`. |
| `humor.minimo_noticias_agregacion` | entero | `3` | Umbral por debajo del cual un agregado se marca `suficiente: false` (secc. 4.3.3). |
| `humor.saturacion_suma` | entero | `5` | Solo aplica si `humor.formula_noticia = suma_acotada`: número de ocurrencias a partir del cual la suma satura. Inerte con la fórmula por defecto. |

**Reglas de la parametrización:**

- **P-1 — Un único punto de resolución.** El motor de sentimiento recibe los parámetros ya resueltos como argumentos; **no lee `CONFIGURACION` por su cuenta**. Es la condición que mantiene C-07 (`ADR-000`, R-4; `ADR-003`, S-2): el motor se prueba pasándole valores, sin base de datos.
- **P-2 — Ningún parámetro nuevo sin ADR.** La parametrización existe para **ajustar** la decisión tras la validación, no para dejarla indefinida. Añadir una cuarta estrategia a `humor.formula_noticia` exige revisar este ADR.
- **P-3 — Cambiar un parámetro no recalcula el histórico.** Ver la regla H-7.
- **P-4 — Validación al arranque.** Si `humor.escala_maxima` no coincide con el máximo absoluto presente en `TERMINO.valor`, el sistema registra una advertencia. Un diccionario con valores fuera de `±humor.escala_maxima` produciría valores de humor fuera de `[-1, 1]` (ver C-V3).

### 4.5 Precisión, redondeo y persistencia

| Atributo | Tipo propuesto | Justificación |
|---|---|---|
| `TERMINO.valor` | `NUMERIC(3,1)` | Cubre `-10,0` a `+10,0`. Un decimal permite calibrar el diccionario sin saltos bruscos; la especificación no exige que los valores sean enteros. |
| `NOTICIA.valor_humor` | `NUMERIC(4,3)` | Cubre `-1,000` a `+1,000`. Tres decimales bastan para ordenar noticias por influencia (`ADR-002`) sin arrastrar ruido numérico. |
| `NOTICIA_TERMINO.aporte_humor` | `NUMERIC(8,2)` | `o_t · v_t` en la escala del diccionario, **sin normalizar**. Margen suficiente para ocurrencias altas. |

- **H-7 — El valor es una instantánea.** `valor_humor` refleja el diccionario y los parámetros **vigentes en `fecha_analisis`**. Editar un término o cambiar un parámetro **no recalcula** las noticias ya analizadas. Motivo: el recálculo masivo no está planificado en ningún sprint, invalidaría los dashboards de forma no reproducible y no es un requisito de la especificación. Si tras la validación (secc. 7) hiciera falta recalcular, se hará como tarea explícita y acotada, no como efecto colateral de una edición del diccionario.
- **H-8 — Redondeo.** Se redondea a la precisión de la columna en el momento de persistir, media hacia arriba en valor absoluto. Las agregaciones se calculan **sobre los valores persistidos** y se redondean a 3 decimales solo en la respuesta de la API.
- **H-9 — `POST /sentiment` usa exactamente la misma función.** El endpoint de `E2-H04` invoca el mismo motor con los mismos parámetros y devuelve el valor en `[-1, 1]` junto con el desglose de términos reconocidos. No persiste nada. Es el requisito que hace el algoritmo verificable desde fuera (C-06).

---

## 5. Consecuencias

### 5.1 Positivas

- Cierra `D-02`, `D-03` y `D-04` con una fórmula cerrada, y desbloquea `E2-H02`, y con ella `E2-H03`, `E2-H04`, `T-DASH-01` y toda la cadena de dashboards del Sprint 3.
- El rango `[-1, 1]` es exacto por construcción: el frontend puede fijar su escala cromática antes de tener un solo dato real.
- C-08 (`MOD-01`, R-M7) se cumple por construcción: `valor_humor = (Σ aporte_humor) / (E · Σ ocurrencias)` es verificable con una sola consulta sobre `NOTICIA_TERMINO`, lo que hace el cálculo auditable noticia a noticia.
- La fórmula es una función pura sobre una lista de pares `(v_t, o_t)`: se prueba con tablas de casos en memoria, sin base de datos ni HTTP (C-07, D-D).
- Devolver el número de noticias junto a cada agregado convierte un problema estadístico invisible —el continente con dos noticias— en un dato que el dashboard puede representar.

### 5.2 Negativas y costes asumidos

- **Se pierde la intensidad acumulada por noticia.** Una noticia con un término extremo y otra con quince del mismo valor obtienen el mismo humor. La información sigue disponible en `NOTICIA_TERMINO` si `ADR-002` la necesita para el criterio de influencia; conviene que ese ADR lo tenga en cuenta al definir `D-05`.
- **Cuatro registros nuevos en `CONFIGURACION`** y la ruta de resolución de parámetros hasta el motor. Es el precio de C-10; sin ello, ajustar la fórmula tras la validación exigiría desplegar código.
- **Dos noticias del mismo medio y fecha pueden diferir mucho** si una trae `description` y la otra no, porque el conjunto de términos reconocidos cambia. El promedio lo atenúa respecto de la suma, pero no lo elimina. Es una limitación del análisis sobre titular + resumen, inherente a la prohibición de *scraping* (Especificación, secc. 3).
- **Corrección a `MOD-01`** (regla H-6): el predicado de noticias pendientes cambia. Sin cambio de esquema, pero hay que actualizar el documento y el índice.

### 5.3 Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Concentración de valores cerca de 0.** El promedio tiende al centro: si el diccionario está dominado por términos de valor bajo, casi todas las noticias caerán en `[-0,3; +0,3]` y el mapa será de un solo color. Es el efecto colateral más probable de haber elegido promedio sobre suma. | Alto | (a) Medirlo explícitamente en la validación (secc. 7, criterio V-3). (b) Si se confirma, **no se rescala el dato**: se corrige la **escala cromática** del mapa —paleta divergente por percentiles o bandas fijas estrechas— en `E3-H01`/`T-DASH-01`. El valor persistido es canónico; la representación es un problema de presentación. (c) Como último recurso, recalibrar los valores del diccionario, que es un dato, no código. |
| **La fórmula no está validada con datos reales** (C-10). | Medio | Protocolo de validación de la secc. 7, ejecutado en el Sprint 2 sobre noticias ya capturadas por `E1-H03`. Si falla, se ajusta vía `humor.formula_noticia` sin cambiar código (secc. 4.4). |
| **Continentes con muy pocas noticias** producen valores extremos y poco fiables en el mapa. | Medio | Regla 4.3.3: `noticias` y `suficiente` en toda respuesta agregada; `humor.minimo_noticias_agregacion = 3` por defecto. El seed de fuentes por continente (`E1-H02`) debe cubrir los seis continentes; si alguno queda sin fuentes, es un defecto de `E1-H02`, no de esta fórmula. |
| **Diccionario desequilibrado entre español e inglés** (C-03): un idioma con más términos reconoce más palabras y produce valores sistemáticamente distintos. | Medio | Criterio V-4 de la validación: comparar la distribución de valores entre ambos idiomas sobre el corpus. `E2-H03` es responsable del equilibrio del diccionario. |
| **Un valor fuera de `[-10, +10]` en `TERMINO.valor`** rompería el rango garantizado. | Bajo | Validación de rango en el CRUD de `/dictionary` (`E2-H01-API`), advertencia al arranque (P-4) y aserción de rango en las pruebas (C-V3). |
| **Deriva entre `POST /sentiment` y el cálculo persistido**, si se implementan por separado. | Bajo | Regla H-9 y criterio C-V5: prueba que compara ambos caminos sobre el mismo texto. |

---

## 6. Cumplimiento y verificación

Cómo se comprueba que la decisión se respeta —y no solo se declara:

| # | Criterio verificable | Momento / mecanismo |
|---|---|---|
| C-V1 | El motor de sentimiento se ejecuta en pruebas unitarias recibiendo una lista de `(valor, ocurrencias)` y los parámetros, sin base de datos ni servidor HTTP. | `QA-S2`, pipeline CI |
| C-V2 | Batería de casos límite en verde: cero términos reconocidos → `valor_humor` nulo y `fecha_analisis` informada; un solo término; todos positivos; todos negativos; términos que se cancelan → 0; término repetido. | `QA-S2` |
| C-V3 | Prueba de propiedad: para cualquier entrada con `v_t ∈ [-10, 10]`, el resultado cae en `[-1, 1]`. Una entrada fuera de rango **falla**, no se recorta. | `QA-S2` |
| C-V4 | Para toda noticia analizada con términos: `valor_humor = round( Σ aporte_humor / (E · Σ ocurrencias) )`. Verificación directa sobre `NOTICIA_TERMINO` (C-08, `MOD-01` R-M7). | `INT-S2`, prueba de integración API↔BD |
| C-V5 | `POST /sentiment` sobre el texto analizado de una noticia ya procesada devuelve el mismo valor que el persistido. | `INT-S2` |
| C-V6 | Ninguna respuesta de agregación omite el número de noticias evaluables; una región sin noticias devuelve `humor: null`, nunca `0`. | `T-DASH-01`, revisión de contrato OpenAPI |
| C-V7 | Los cuatro parámetros de la secc. 4.4 existen en `CONFIGURACION` con sus valores por defecto tras el *seed*, y cambiar `humor.formula_noticia` altera el resultado del motor sin recompilar. | `INT-S2` |
| C-V8 | El motor no importa ni consulta `CONFIGURACION` (regla P-1). | Revisión de *pull request*; análisis estático |
| C-V9 | El protocolo de validación de la secc. 7 se ha ejecutado y su informe está publicado en `docs/`. | Cierre de `E2-H02` |

Estos criterios se incorporan a la verificación de `E2-H02` y complementan la *Definition of Done* acordada en `DOD-01`.

---

## 7. Protocolo de validación con datos reales

Exigido por C-10 y por el registro de riesgos de la planificación. Es condición para cerrar `E2-H02`, y el objeto del criterio C-V9.

| Paso | Contenido | Responsable |
|---|---|---|
| **V-0** | **Corpus.** 100 noticias reales ya capturadas por `E1-H03`: 50 en español y 50 en inglés, de al menos 3 continentes distintos, seleccionadas al azar del conjunto capturado (sin elegir a mano las llamativas). | David Cortez |
| **V-1** | **Etiquetado manual.** Dos integrantes etiquetan cada noticia de forma independiente como `negativa`, `neutra` o `positiva` leyendo solo el texto analizado. Los desacuerdos se resuelven en una tercera lectura conjunta. | José Romero + Sebastián Márquez |
| **V-2** | **Concordancia de signo.** Criterio de aceptación: el signo del `valor_humor` coincide con la etiqueta manual en **≥ 70 %** de las noticias etiquetadas como `positiva` o `negativa`. Se informa también qué porcentaje del corpus quedó sin términos reconocidos (`valor_humor` nulo). | Matías Santos |
| **V-3** | **Distribución.** Histograma de `valor_humor` sobre el corpus. Se documenta la proporción de valores dentro de `[-0,3; +0,3]`. Si supera el **80 %**, se activa la mitigación de escala cromática de la secc. 5.3. | Matías Santos |
| **V-4** | **Equilibrio entre idiomas.** Comparación de la media y de la tasa de términos reconocidos entre el subcorpus español y el inglés. Una diferencia marcada se escala a `E2-H03` como defecto del diccionario, no de la fórmula. | José Romero |
| **V-5** | **Informe y decisión.** Resultado publicado en `docs/sprints/` y enlazado desde este ADR. Si V-2 no alcanza el umbral, se prueban las alternativas vía `humor.formula_noticia` antes de considerar cualquier cambio de código, y este ADR se revisa registrando el ajuste en la secc. 11. | Matías Santos |

> La validación es de **fórmula**, no de diccionario: su resultado puede indicar que el diccionario está mal calibrado, y ese es un hallazgo legítimo que se deriva a `E2-H03`. Lo que la validación no puede hacer es declarar válida una fórmula sobre un diccionario vacío; por eso V-0 exige que `E2-H01-API` esté cerrada y el diccionario poblado.

---

## 8. Trazabilidad

| Elemento de este ADR | Origen |
|---|---|
| Escala del diccionario `[-10, +10]` | Especificación, secc. 10.4; `D-01` |
| Persistencia del valor de humor junto a la noticia | Especificación, secc. 4.2.4 |
| Autorización expresa para usar otra fórmula distinta de la suma | Especificación, secc. 10.4, párrafo final |
| Mapa por continente con selector de fecha; lista de noticias influyentes | Especificación, secc. 4.3.2 |
| Filtros por continente y país | Especificación, secc. 4.3.1 y 4.3.2 |
| `POST /sentiment` para texto suelto | Especificación, secc. 10.2 |
| Análisis en español e inglés | Especificación, secc. 3 y 4.4 |
| Cobertura ≥ 80 % y pruebas de integración entre capas | Especificación, secc. 7 |
| Motor de dominio aislable, sin base de datos ni HTTP | `ADR-000`, regla R-4; `ADR-003`, regla S-2 |
| Geografía por navegación `NOTICIA → FUENTE_RSS → CANAL` | `MOD-01`, regla R-M4 |
| Coherencia `valor_humor` ↔ `aporte_humor` | `MOD-01`, regla R-M7 |
| `CONFIGURACION` como entidad clave-valor | `MOD-01`, secc. 3.5 |
| `D-02` promedio, `D-03` normalización a `[-1, 1]`, `D-04` promedio de noticias | Planificación de Sprints v2, secc. 2 — **decisiones adoptadas por el equipo** |
| Obligación de validar con datos reales y dejar la fórmula parametrizable | Planificación de Sprints v2, registro de riesgos |
| Criterio de finalización y dependencia con `E2-H02` | Planificación de Sprints v2, tabla detallada S2; Plan de carga de Jira, EP-2 |
| Ponderación por ocurrencias, reglas H-1 a H-9, P-1 a P-4, casos límite, precisión, umbral de volumen y protocolo de validación | **Decisión del equipo adoptada en este ADR** (no derivada literalmente de las fuentes) |

---

## 9. Supuestos y puntos abiertos

1. **Supuesto.** El diccionario tendrá suficiente cobertura léxica en ambos idiomas para que la mayoría de las noticias reconozca al menos un término. Si la proporción de noticias con `valor_humor` nulo resultara alta en V-2, el problema es de diccionario (`E2-H03`) y no de esta fórmula.
2. **Punto abierto.** La regla **H-4** (agregar por `fecha_registro` y no por `fecha_publicacion`) se adopta aquí por necesidad, pero **debe confirmarse con Backend y Frontend** al definir el contrato de `T-DASH-01`. Es la única regla de este ADR que fija comportamiento visible para el usuario sin respaldo previo en ninguna fuente.
3. **Punto abierto.** `ADR-002` define `D-05` (noticia influyente = mayor valor absoluto de humor). Conviene que tenga en cuenta la consecuencia 5.2: con el promedio, el valor absoluto ya no refleja cuántos términos cargados contiene la noticia. Si el equipo quiere que la influencia pondere volumen de evidencia, el dato está en `NOTICIA_TERMINO` y es `ADR-002` quien debe decidirlo.
4. **Corrección requerida en `MOD-01`.** Regla H-6: sustituir el predicado de noticias pendientes `valor_humor IS NULL` por `fecha_analisis IS NULL` en la secc. 3.3 y en el índice de selección de pendientes. Sin cambio de esquema. Debe aplicarse **antes** de implementar `E2-H02`, o el cron reprocesará indefinidamente las noticias sin términos reconocidos.
5. **Punto abierto.** `MOD-01`, secc. 8, decisión abierta n.º 4 (modelado de `CONFIGURACION` como clave-valor) sigue pendiente de confirmación de Backend. Este ADR **depende** de esa confirmación: la parametrización de la secc. 4.4 asume el modelo clave-valor. Si se rechazara, los cuatro parámetros exigirían columnas y una migración.
6. **Observación de proceso.** El Sprint 2 va del 7 al 25 de septiembre de 2026; este ADR se redactó y se aprobó el 22 de septiembre, **dentro** de la ventana y con tres días de margen hasta el cierre. La aprobación desbloquea `E2-H02`, pero el protocolo de la secc. 7 exige además que `E2-H01-API` esté cerrada y el diccionario poblado. Si esas condiciones no se cumplen antes del cierre del sprint, procede desplazar la **validación** (secc. 7, criterio C-V9) al Sprint 3 manteniendo aprobada la fórmula, y dejar constancia de la desviación en la retrospectiva.

---

## 10. Referencias

1. Especificación del Proyecto Final **HumWorld — ¿De qué humor está el mundo?**, Universidad Andrés Bello, curso 2026-27 (secc. 2, 3, 4.2.2, 4.2.4, 4.3.1, 4.3.2, 4.4, 7, 10.2, 10.3, 10.4).
2. **ADR-000 — Arquitectura en tres capas**, reglas R-1 a R-6 (en particular R-3 y R-4).
3. **ADR-003 — Selección del stack tecnológico**, reglas S-1 a S-5 (en particular S-2).
4. **MOD-01 — Modelo E/R inicial**, secc. 3.3 (`NOTICIA`), 3.4 (`TERMINO`), 3.5 (`CONFIGURACION`), 3.6 (`NOTICIA_TERMINO`), 4.6, reglas R-M4 y R-M7, y secc. 8 (decisiones abiertas 1 y 4).
5. **Planificación de Sprints HumWorld v2** — secc. 2 (decisiones `D-01` a `D-04` y aclaración obligatoria), tabla detallada del Sprint 2 y registro de riesgos.
6. **Plan de carga de Jira (HUM)** — épica `EP-2`, tareas `ADR-001` (3 puntos) y `E2-H02` (8 puntos).
7. **Backlog Definitivo HumWorld** — épica 2, historias `E2-H01` a `E2-H04`.

---

## 11. Historial de revisiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 1.0 | 2026-09-22 | Matías Santos | Redacción inicial. Formaliza `D-02`, `D-03` y `D-04`; fija la fórmula por noticia y la agregación geográfica, el rango `[-1, 1]`, las reglas H-1 a H-9 y P-1 a P-4, la parametrización vía `CONFIGURACION` y el protocolo de validación con datos reales. Registra la corrección requerida en `MOD-01` (regla H-6) y el punto abierto de la regla H-4. Revisado y acordado por los cuatro integrantes en la misma fecha. Estado: **Aceptado**. |
