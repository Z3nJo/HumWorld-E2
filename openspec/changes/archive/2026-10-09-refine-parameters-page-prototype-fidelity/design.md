# Design

## Context

La implementación actual ya tiene una página `/parametros`, un flujo de formulario para dos campos y un cliente para `GET/PUT /api/v1/config`. El prototipo añade una tarjeta de agregación de humor y define la composición visual objetivo. El backend actual no expone ese tercer campo por el contrato de configuración, por lo que el frontend debe preservar la forma visual sin inventar una capacidad de persistencia.

## Goals / Non-Goals

**Goals:**

- Alinear la composición y los estilos de la página con el HTML de referencia.
- Conservar la arquitectura frontend existente y las llamadas relativas a la API.
- Hacer explícita la diferencia entre parámetros editables y parámetros pendientes de soporte backend.
- Corregir textos y estados de interacción visibles.

**Non-Goals:**

- Modificar FastAPI, esquemas Pydantic, servicios, modelos, migraciones o endpoints.
- Persistir parámetros no soportados mediante estado local, `localStorage` o campos adicionales no aceptados por la API.
- Implementar páginas de fuentes, diccionario, operaciones o dashboard.

## Decisions

1. **Reutilizar el flujo actual de configuración.** Se conservarán el hook, el mapeo DTO y el cliente HTTP existentes, ajustándolos solo donde sea necesario para representar estados o textos. Esto evita duplicar la integración con `/api/v1/config`.

2. **Separar capacidad visual de capacidad de persistencia.** La tarjeta `humor.minimo_noticias_agregacion` se renderizará con una indicación de disponibilidad y no formará parte del payload mientras el backend no la exponga. La alternativa de añadir un endpoint o ampliar el payload queda descartada por el límite de alcance.

3. **Usar estilos de la página y variables globales existentes.** Se ajustarán CSS y componentes del frontend para reproducir el prototipo sin añadir dependencias ni cambiar el sistema visual global salvo que una corrección sea necesaria para esta pantalla.

4. **Verificar contra el prototipo y la API.** La aceptación combinará comparación visual de `/parametros`, pruebas de validación/estados y comprobación de que las peticiones contienen solo los dos campos soportados.

## Risks / Trade-offs

- [El prototipo y la aplicación pueden tener diferencias de fuente o viewport] → validar en el mismo ancho de referencia y usar las variables visuales ya definidas.
- [La API puede devolver errores con formatos distintos] → conservar el manejo de error existente y mostrar un mensaje legible sin ocultar el detalle técnico disponible.
- [La tarjeta de humor será visualmente completa pero funcionalmente limitada] → etiquetarla claramente como pendiente de soporte backend y excluirla del payload.

## Migration Plan

No hay migración de backend. Aplicar los cambios del frontend, ejecutar las pruebas existentes y verificar manualmente la página con el backend actual. El rollback consiste en revertir únicamente los cambios de `frontend/src`.
