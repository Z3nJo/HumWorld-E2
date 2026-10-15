# Tasks

## 1. Ajustar el modelo de pantalla y los textos

- [x] 1.1 Revisar `ParametersPage` y `ConfigCards` para corregir todos los textos visibles, etiquetas accesibles y mensajes de estado; verificar que no queden secuencias de codificación incorrecta en la página.
- [x] 1.2 Añadir la tarjeta visual de `humor.minimo_noticias_agregacion` con estado no disponible/no editable cuando la API no entregue ese campo; verificar que el campo no aparezca en el payload de guardado.

## 2. Igualar el diseño del prototipo

- [x] 2.1 Ajustar la estructura JSX y `ParametersPage.css` para igualar al prototipo la cuadrícula, tarjetas, cabeceras, espaciado, tamaños, inputs, mensajes de ayuda y acciones inferiores; verificar visualmente `/parametros` en el mismo viewport del HTML de referencia.
- [x] 2.2 Mantener el flujo de carga, error, descarte, guardado, estado dirty, loading y toast; verificar con las pruebas de la página los estados de éxito, error y formulario inválido.

## 3. Verificar integración frontend/API

- [x] 3.1 Confirmar que `GET /api/v1/config` hidrata periodicidad y caducidad y que `PUT /api/v1/config` envía únicamente ambos campos soportados; verificar con pruebas del cliente o inspección de la petición.
- [x] 3.2 Ejecutar lint, pruebas y build del frontend; verificar que no se haya modificado ningún archivo bajo `backend/` y que la pantalla funcione mediante las rutas relativas `/api/v1/config`.

## Workflow follow-up

- Revisar los artefactos con el usuario antes de iniciar la implementación.
- Cuando el usuario lo solicite explícitamente, aplicar el cambio mediante `openspec-apply-change`.
