# Definition of Done — HumWorld

| Campo | Valor |
|---|---|
| **Tarea** | `DOD-01` — Definition of Done acordada por el equipo (Sprint 0, épica `EP-0`) |
| **Versión** | 1.0 — **Acordada por el equipo** (Daily del 25 de agosto de 2026) |
| **Facilitador** | Matías Santos (Arquitectura y Documentación) |
| **Participantes de la decisión** | José Romero (Backend), Sebastián Márquez (Frontend), David Cortez (DevOps y Calidad), Matías Santos (Arquitectura y Documentación) |
| **Fecha de redacción** | 25 de agosto de 2026 |
| **Criterio de finalización de DOD-01** | "DoD documentada en `/docs` y aceptada explícitamente por los 4 integrantes" *(Planificación de Sprints v2, tabla detallada, fila S0/DOD-01)* |
| **Próxima revisión obligatoria** | Retrospectiva del Sprint 1 |

> **Estado.** Esta DoD está **vigente**. Fue acordada por los cuatro integrantes en la Daily del 25 de agosto de 2026 y rige desde el Sprint 1. La versión anterior de este archivo (10 puntos, sin registro de aceptación) queda incorporada íntegramente: ninguno de sus puntos se elimina (ver secc. 7.2). Se revisa de forma obligatoria en la retrospectiva del Sprint 1.

---

## 1. Qué es y qué no es esta DoD

**Es** el conjunto de condiciones que **toda** unidad de trabajo debe cumplir para moverse a *Done*. Es idéntica para todas las historias y no se negocia por historia.

**No es** la lista de criterios de aceptación: esos son propios de cada historia y están en el Backlog Definitivo. Una historia puede cumplir sus criterios de aceptación y **no** estar *Done* si incumple esta DoD.

**Consecuencia de incumplirla:** el ítem no se mueve a *Done*, no cuenta para la velocidad del sprint y vuelve a *En curso* o al backlog. No existe la categoría "terminado al 90 %".

### 1.1 Tres niveles

| Nivel | Se aplica a | Quién lo verifica |
|---|---|---|
| **N1 — DoD de ítem** | Cada historia de usuario o tarea técnica | El revisor del *pull request* |
| **N2 — DoD de Sprint** | El incremento completo al cierre de cada sprint | El equipo en la revisión de sprint |
| **N3 — DoD de Release** | El entregable de la verificación formal del 2 de noviembre de 2026 | El equipo, antes del congelamiento del 30 de octubre |

---

## 2. N1 — DoD de ítem (historia de usuario o tarea técnica)

### 2.1 Código y control de versiones

1. El código está versionado en GitHub, en una rama nombrada con el identificador del ítem *(ej.: `feature/E1-H01-alta-fuentes-rss`)*.
2. Los cambios se integran mediante *pull request*; **no se hace push directo** a la rama principal.
3. El *pull request* fue revisado y aprobado por **al menos un integrante distinto del autor**.
4. Los mensajes de commit y el título del PR referencian el identificador del ítem, de modo que la trazabilidad backlog → código sea reconstruible.

### 2.2 Conformidad arquitectónica *(ADR-000)*

5. El cambio respeta las reglas R-1 a R-6 del ADR-000. En particular:
   - la capa de presentación **no** accede a la base de datos y consume el sistema únicamente a través de `/api/v1`;
   - los módulos de `api/` **no** contienen reglas de negocio: delegan en `services/`;
   - los módulos de `services/` **no** ejecutan sentencias contra el gestor de datos: usan los repositorios.
6. Si el cambio exige apartarse de una decisión arquitectónica vigente, **existe un ADR nuevo o una revisión del ADR afectado** antes de mezclar el PR.

### 2.3 Pruebas

7. Existen pruebas unitarias de la lógica de negocio incorporada o modificada, y pasan en local y en CI.
8. Existen pruebas de integración cuando el ítem **cruza una frontera de capa** (API ↔ base de datos, o Frontend ↔ API).
9. Las pruebas nuevas se ejecutan dentro del pipeline, no solo en la máquina del autor.
10. Se cumple el umbral de cobertura vigente para el sprint en curso según la tabla de la sección 5.

> **Regla objetiva para "cuando aplique"** *(punto abierto D-4 de la sesión de acuerdo)*: un ítem que **no** modifica lógica de negocio ni consultas de datos —por ejemplo documentación, estilos o configuración de CI— está exento de los puntos 7 y 8. Todo ítem que modifique `services/`, `repositories/` o `api/` **no está exento**.

### 2.4 API y contratos

11. Todo endpoint creado o modificado está publicado en la documentación OpenAPI accesible en `/api/docs`, bajo la base `/api/v1`, con formato JSON y los códigos de respuesta estándar de la especificación (200, 201, 204, 400, 404, 500).
12. El contrato OpenSpec correspondiente está versionado en `opsx/` cuando el ítem introduce o cambia un contrato.
13. El frontend no consume ningún endpoint que no esté previamente publicado en `/api/docs`.

### 2.5 Documentación

14. La documentación afectada en `docs/` está actualizada en el **mismo** *pull request* que el código: nunca en un PR posterior.
15. Si el ítem materializa o modifica una decisión registrada en un ADR, el ADR queda referenciado desde el PR.

### 2.6 Integración, entorno y calidad

16. El pipeline de CI queda **en verde** sobre la rama del PR.
17. Si el cambio afecta configuración, dependencias o despliegue, `docker compose -f opsx/docker-compose.yml up --build` levanta el entorno sin errores.
18. El análisis de calidad de código no reporta incidencias críticas ni bloqueantes **sobre el código nuevo o modificado**, según el nivel de exigencia vigente en la tabla de la sección 5.

### 2.7 Validación funcional

19. La funcionalidad fue validada manualmente contra **los criterios de aceptación que el Backlog Definitivo define para esa historia**, y la evidencia quedó registrada en el PR *(captura, salida de consola o colección de peticiones)*.
20. El ítem funciona sobre el entorno levantado con Docker, no solo en el entorno local del autor.

---

## 3. N2 — DoD de Sprint

El incremento del sprint está *Done* cuando, además de que **todos** sus ítems cumplan N1:

1. No queda ningún ítem en estado intermedio: cada uno está *Done* o explícitamente devuelto al backlog con su motivo registrado.
2. Los ADR comprometidos para el sprint están **aprobados**, no solo redactados *(ADR-001 en Sprint 2; ADR-002 en Sprint 3)*.
3. La documentación del sprint y los contratos OpenSpec correspondientes están publicados *(tareas `DOC-S1`, `DOC-S2`, …)*.
4. Las pruebas de integración planificadas para el sprint se ejecutan en CI y están en verde *(`INT-S1`, `INT-S2`, …)*.
5. El incremento es demostrable de extremo a extremo sobre el entorno Docker.
6. Se cumple el umbral de cobertura y de calidad correspondiente al sprint según la sección 5.
7. Se registró en la retrospectiva si la DoD tuvo que relajarse en algún punto, y por qué.

---

## 4. N3 — DoD de Release (verificación formal del 2 de noviembre de 2026)

El producto está listo para la entrega cuando, además de N1 y N2:

1. **Cobertura de pruebas unitarias ≥ 80 %** en los módulos de captura, análisis y purgado *(Especificación, secc. 7; tarea `QA-01`)*.
2. **Sin incidencias críticas ni bloqueantes** en el análisis de calidad de código *(tarea `QA-02`)*.
3. La documentación Swagger/OpenAPI cubre **la totalidad** de los endpoints mínimos obligatorios de la especificación *(secc. 10.2: `/sources`, `/news`, `/dictionary`, `/config`, `/sentiment`, `/dashboards`)*.
4. Los diagramas UML exigidos están publicados en `docs/uml/`: casos de uso, modelo entidad/relación y diagrama de componentes *(Especificación, secc. 4.7, punto 3)*.
5. Todos los ADR están publicados en `docs/adr/`, con el mismo formato y con estado resuelto *(Especificación, secc. 4.7, punto 4; P2 — Agentes)*.
6. El `README.md` contiene instrucciones de despliegue verificadas por alguien que **no** las escribió, sobre una máquina limpia.
7. Los ficheros de contexto y prompts de IA y los contratos generados por OpenSpec están incluidos en el repositorio *(Especificación, secc. 4.7, puntos 5 y 6)*.
8. El entregable `EQUIPO_HUMWORLD.tgz` está armado con código, `/docs`, ficheros de contexto, documentación OpenSpec, ficheros de configuración e instrucciones de despliegue *(Especificación, secc. 9)*.
9. El profesor tiene acceso concedido al repositorio de GitHub *(Especificación, secc. 9)*.
10. Todo lo anterior está cerrado **antes del congelamiento interno del 30 de octubre de 2026**, dejando el 31 de octubre y el 1 de noviembre solo para estabilización *(Planificación v2, secc. 3)*.

---

## 5. Umbrales progresivos por sprint

La especificación fija los umbrales del **cierre** del proyecto, no de cada sprint. Aplicarlos desde el Sprint 1 bloquearía la entrega; ignorarlos hasta el Sprint 4 concentraría todo el riesgo al final. La propuesta es endurecerlos por tramos:

| Criterio | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 / Release |
|---|---|---|---|---|
| **Revisión cruzada del PR** | Obligatoria | Obligatoria | Obligatoria | Obligatoria |
| **CI en verde** | Obligatorio | Obligatorio | Obligatorio | Obligatorio |
| **Pruebas unitarias del ítem** | Obligatorias en captura | Obligatorias en sentimiento y purgado | Obligatorias | Obligatorias |
| **Cobertura** | Se mide y se reporta, **sin umbral bloqueante** | **≥ 80 %** en motor de sentimiento y purgado | ≥ 80 % mantenido en los módulos ya cubiertos | **≥ 80 %** en captura, análisis y purgado *(bloqueante)* |
| **Pruebas de integración** | API ↔ BD *(`INT-S1`)* | API ↔ BD *(`INT-S2`)* | Frontend ↔ API | Integración completa *(`INT-01`)* |
| **Análisis de calidad de código** | Configurado, resultado **informativo** | Informativo | **Sin nuevos críticos ni bloqueantes** | **Sin críticos ni bloqueantes** *(bloqueante, `QA-02`)* |
| **Swagger/OpenAPI** | Todo endpoint publicado antes de consumirse | Íd. | Íd. | Revisión íntegra *(`SWG-04`)* |

> Los tramos de las filas "Cobertura" y "Análisis de calidad" son **propuesta del facilitador**, no exigencia de las fuentes: la especificación solo fija el 80 % y la ausencia de críticos como estado final. Son el principal punto a acordar en la sesión.

---

## 6. Reglas de aplicación

1. **Quién declara *Done*:** el revisor del PR, no el autor. Nadie aprueba su propio trabajo.
2. **Ítems arrastrados entre sprints:** un ítem que no cumple la DoD al cierre del sprint no se "hereda" como terminado; vuelve al backlog y se replanifica *(caso previsto para `E1-H05` entre Sprint 1 y Sprint 2)*.
3. **Excepciones:** cualquier excepción a la DoD requiere acuerdo explícito del equipo, se registra en la documentación del sprint y se revisa en la retrospectiva. Una excepción no acordada es simplemente un incumplimiento.
4. **Tareas técnicas y de infraestructura** *(`INFRA-*`, `CICD-*`, `SWG-*`)*: aplican los puntos 1 a 6, 14 a 18 y 20; quedan exentas de los puntos 7 a 9 salvo que introduzcan lógica.
5. **Vigencia:** esta DoD se revisa obligatoriamente en la retrospectiva del Sprint 1, cuando ya exista velocidad real observada, y puede endurecerse o relajarse por acuerdo del equipo. Cada cambio genera una nueva versión en la sección 9.

---

## 7. Trazabilidad

### 7.1 Origen de los criterios

| Criterio | Fuente |
|---|---|
| Código versionado en GitHub | Especificación, secc. 4.6.2 |
| Pruebas unitarias por módulo y cobertura ≥ 80 % | Especificación, secc. 7 |
| Pruebas de integración API ↔ BD y Frontend ↔ API | Especificación, secc. 7 |
| Pipeline CI que ejecuta pruebas, análisis de calidad y build de la imagen Docker | Especificación, secc. 4.6.3 |
| Estándares de calidad de código y ausencia de críticos | Especificación, secc. 4.6.2 |
| Documentación en `/docs`, ADR, UML, contratos OpenSpec | Especificación, secc. 4.7 |
| Swagger/OpenAPI en `/api/docs`, base `/api/v1`, JSON y códigos estándar | Especificación, secc. 10.1 y 10.3 |
| Endpoints mínimos obligatorios | Especificación, secc. 10.2 |
| Entregable `EQUIPO_HUMWORLD.tgz` y acceso del profesor | Especificación, secc. 9 |
| Reglas de conformidad arquitectónica R-1 a R-6 y criterios C-V1 a C-V8 | ADR-000 |
| Criterios de aceptación por historia | Backlog Definitivo |
| Tareas `QA-S1`, `INT-S1`, `QA-S2`, `INT-S2`, `QA-01`, `QA-02`, `INT-01`, `DOC-Sx`, `SWG-04`; congelamiento del 30 de octubre | Planificación de Sprints v2, secc. 3 y 4 |
| Niveles N1/N2/N3, umbrales progresivos por sprint y reglas de aplicación | **Propuesta del facilitador, a acordar por el equipo** |

### 7.2 Correspondencia con la versión anterior del documento

Los 10 puntos de la versión previa se conservan íntegros: (1) → 2.1.1 · (2) → 2.1.3 · (3) → 2.5.14 · (4) → 2.4.11 · (5) → 2.3.7 · (6) → 2.3.8 · (7) → 2.6.17 · (8) → 2.6.16 · (9) → 2.6.18 · (10) → 2.7.19.

Lo que esta versión **añade**: trazabilidad por identificador de ítem, conformidad con el ADR-000, publicación de contratos OpenSpec, umbrales progresivos por sprint, niveles de Sprint y de Release, reglas de aplicación y registro de aceptación.

---

## 8. Registro de aceptación

> Criterio de finalización de `DOD-01`: *"DoD documentada en `/docs` y aceptada explícitamente por los 4 integrantes"*.

| Integrante | Rol | Acepta la DoD v1.0 | Fecha | Observaciones |
|---|---|---|---|---|
| José Romero | Backend | ☑ | 2026-08-25 | Aceptación verbal en la Daily |
| Sebastián Márquez | Frontend | ☑ | 2026-08-25 | Aceptación verbal en la Daily |
| David Cortez | DevOps y Calidad | ☑ | 2026-08-25 | Aceptación verbal en la Daily |
| Matías Santos | Arquitectura y Documentación | ☑ | 2026-08-25 | Facilitador de la sesión |

**Versión acordada en sesión:** 1.0  **Fecha de la sesión:** 25 de agosto de 2026

**Mecanismo de la aceptación.** El acuerdo se alcanzó de forma verbal, con los cuatro integrantes presentes, durante la Daily del 25 de agosto de 2026. No se recogió confirmación individual por escrito. Matías Santos, como facilitador, deja constancia del acuerdo en este registro; cualquier integrante que no se reconozca en él debe indicarlo en la revisión de este *pull request* o en la retrospectiva del Sprint 1.

---

## 9. Historial de versiones

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 0.1 | — | Equipo (repositorio inicial) | Lista inicial de 10 puntos, sin registro de aceptación. |
| 1.0 | 2026-08-25 | Matías Santos | Tres niveles (ítem, sprint, release), conformidad con ADR-000, umbrales progresivos por sprint, reglas de aplicación, trazabilidad a las fuentes y registro de aceptación. **Acordada en la Daily del 25 de agosto de 2026; vigente desde el Sprint 1.** |
