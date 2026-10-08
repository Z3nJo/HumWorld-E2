# HumWorld — Frontend

## Arquitectura interna

El frontend sigue [ADR-004](../docs/adr/ADR-004-arquitectura-interna-frontend.md) para funcionalidades nuevas. La organización es por funcionalidad:

```text
src/
├── app/          arranque, rutas y proveedores
├── shared/       utilidades transversales; HTTP en shared/api/httpClient.ts
└── features/
    └── <feature>/
        ├── domain/
        ├── infrastructure/
        ├── application/
        └── presentation/
```

`domain` no depende de React ni de la red. `infrastructure` conoce DTOs y usa el cliente HTTP compartido. `application` orquesta la funcionalidad y `presentation` renderiza React. No se crean carpetas vacías.

La estructura histórica (`src/api`, `src/types`, `src/pages`) se mantiene durante la migración y no se reescribe como prerrequisito. Las funcionalidades nuevas deben usar `features/`; el diccionario se migrará cuando tenga una modificación sustancial.

### Pruebas

Las funciones puras y mapeadores se prueban con Vitest sin DOM ni red cuando sea posible. Las funcionalidades que cruzan la frontera Frontend ↔ API requieren además una prueba de integración contra el entorno Docker o un backend de prueba.

Comandos locales:

```bash
npm run lint
npm run build
npm run test
```

## Plantilla Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
