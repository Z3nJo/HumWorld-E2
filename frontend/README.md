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

El gestor de paquetes es **pnpm** (versión fijada en `packageManager` de `package.json`; se activa con `corepack enable`).

```bash
pnpm install
pnpm run lint
pnpm run build
pnpm run test
```

## Empaquetado Docker

El contexto de construcción es `frontend/`. El Dockerfile copia explícitamente
`package.json`, `pnpm-lock.yaml`, `index.html`, `vite.config.ts`,
`eslint.config.js`, los tres archivos `tsconfig*.json`, `src/` y `public/`.
Las dependencias se instalan dentro de la imagen con el lockfile. La imagen
conserva los recursos para ejecutar Vite, build, lint y las pruebas.

`.dockerignore` excluye configuraciones `.env` y `.env.*` (también
`.env.example`), `.npmrc`, claves `.pem` y `.key`, metadatos Git, dependencias
locales, compilaciones previas, cobertura, informes de pruebas y logs. Las
exclusiones cubren también archivos anidados en `src/` y `public/`.
No se deben escribir credenciales en el código fuente ni en recursos públicos.

Docker recibe su configuración mediante variables del entorno: Compose pasa
`VITE_API_TARGET=http://backend:3000` para el proxy `/api`. No necesita copiar un
`.env` a la imagen. Las variables `VITE_*` pueden quedar expuestas al navegador;
no deben contener secretos. El uso local de archivos `.env` fuera de Docker
permanece disponible.

Para añadir un archivo raíz o directorio nuevo necesario para la aplicación,
añadir su copia explícita al Dockerfile y revisar las exclusiones. Reconstruir
la imagen y verificar build, lint, pruebas, recursos públicos y el proxy antes
de sustituir el contenedor en uso. Los archivos raíz no seleccionados no se
incorporan automáticamente a la imagen.

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
