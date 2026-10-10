# Design

## Context

La implementación actual ya dispone de una página React para `/fuentes`, un hook de estado y un adaptador para `/api/v1/sources`. La API devuelve una fila por fuente RSS con un resumen del canal; no devuelve una colección de canales administrables ni un estado independiente para el canal. El prototipo de referencia usa una composición visual de fuente/medio con sus canales RSS anidados.

## Goals / Non-Goals

**Goals:**

- Reutilizar el flujo existente de datos y los contratos REST sin introducir endpoints nuevos.
- Separar la fidelidad visual de la transformación de datos: mapear filas RSS a grupos de canal para la tabla.
- Mantener estados locales de carga, error, drawer, modal, expansión y notificaciones coherentes con la referencia.
- Comparar la página en un viewport equivalente al HTML de referencia y corregir textos/estilos hasta lograr una coincidencia visual.

**Non-Goals:**

- No modificar `backend/`, modelos, migraciones, semillas ni contratos OpenAPI.
- No inventar persistencia para activar/desactivar canales como entidad independiente.
- No añadir autenticación, scraping ni nuevos tipos de fuente.

## Decisions

### 1. Mantener la API existente como fuente de verdad

El adaptador continuará usando `GET /api/v1/sources` para la carga, `POST` para alta por lote, `PUT` para edición, `PATCH` para estado de la fuente y `DELETE` para eliminación. Esto evita duplicar lógica y conserva las validaciones de backend. Una API nueva de canales se considera alternativa descartada porque excede el alcance frontend.

### 2. Agrupar por `channel.id` en la capa de aplicación

Las filas recibidas se agruparán por identificador de canal antes de renderizar. La capa de presentación recibirá grupos con sus fuentes y contadores, mientras que los DTO y nombres del backend permanecerán aislados en infraestructura. Así se obtiene la estructura anidada del prototipo sin asumir un payload distinto.

### 3. Aplicar estilos locales de la página y tokens compartidos

Se conservarán los tokens globales del shell y se ajustará `SourcesPage.css` junto con los componentes de tabla/drawer/modal para reproducir el prototipo. La alternativa de copiar el HTML monolítico se descarta porque rompería la arquitectura React y dificultaría la integración real.

### 4. Mantener y bloquear las capacidades no soportadas

Todo elemento visual del prototipo debe permanecer en la composición. Si depende de un campo o endpoint ausente, se renderizará con el mismo aspecto general, pero con estado disabled/no editable, etiqueta `REQUIERE BACK` y una ayuda contextual. No se hará una mutación optimista ni se enviará una petición inventada. Se seguirá el patrón de `ConfigCards` en `/parametros`, donde el parámetro no disponible permanece visible y bloqueado.

### 5. Verificar antes de entregar

Se ejecutarán pruebas de la funcionalidad de fuentes, lint y build del frontend. También se comprobará que las solicitudes usen rutas relativas `/api/v1`, que los errores reviertan estados optimistas y que no haya cambios bajo `backend/`.

## Risks / Trade-offs

- [El modelo del prototipo agrupa canales de forma diferente al API] → Mantener el agrupamiento derivado por `id_canal` y documentar las limitaciones de canal.
- [El backend no devuelve país ni estado propio del canal] → Mantener columnas, selectores e interruptores visibles, bloquearlos y marcarlos `REQUIERE BACK`.
- [Un control bloqueado parece interactivo] → Usar `disabled`, estilos de estado bloqueado, texto de ayuda y nombres accesibles que indiquen la causa.
- [La comparación visual puede variar por fuentes instaladas o viewport] → Usar el mismo viewport y verificar tipografías, espaciado y colores mediante una captura local.
- [Una modificación de fuente puede fallar después de una actualización optimista] → Revertir el estado local y mostrar el error devuelto por la API.
- [Los textos existentes presentan mojibake] → Auditar los archivos afectados y guardar los textos como UTF-8 durante la implementación.

## Migration Plan

No hay migración de backend ni de datos. El cambio se despliega como una actualización del bundle frontend. El rollback consiste en revertir los archivos frontend del cambio y volver a construir el bundle anterior.
