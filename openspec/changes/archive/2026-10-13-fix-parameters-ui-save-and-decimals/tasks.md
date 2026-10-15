# Tasks

## 1. Separación de errores y preservación de borrador

- [x] 1.1 Diferenciar `loadError` y `saveError` en `useConfig.ts` y verificar que saveConfig no sobreescriba loadError.
- [x] 1.2 Adaptar `ParametersPage.tsx` para mostrar error de guardado sin ocultar formulario ni descartar borrador.

## 2. Soporte numérico y rechazo de decimales

- [x] 2.1 Reemplazar `parseInt` por `valueAsNumber` en los inputs numéricos de `ConfigCards.tsx`.
- [x] 2.2 Verificar que `validateConfig` rechace números decimales (e.g. 1.5).

## 3. Desacople de estilos CSS

- [x] 3.1 Renombrar clases en `ParametersPage.css` a `.params-*` para eliminar colisiones globales con `DictionaryPage.css`.
- [x] 3.2 Actualizar las clases utilizadas en `ParametersPage.tsx` y `ConfigCards.tsx`.

## 4. Pruebas y verificación

- [x] 4.1 Añadir pruebas unitarias en `ParametersPage.test.tsx` cubriendo fallo de guardado en PUT y entrada decimal.
- [x] 4.2 Ejecutar suite de pruebas frontend (`npm run test`), lint (`npm run lint`) y build (`npm run build`).
