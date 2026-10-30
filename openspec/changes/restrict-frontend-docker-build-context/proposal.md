## Why

SonarQube señala como High la copia recursiva `COPY . .` del Dockerfile del frontend. El contexto actual excluye pocos archivos y permite incorporar configuraciones privadas o resultados locales innecesarios a una imagen compartida.

## What Changes

- Sustituir la copia del contexto completo por copias explícitas de los archivos y directorios necesarios para ejecutar, construir y verificar el frontend.
- Excluir del contexto Docker configuraciones privadas, claves y artefactos locales, incluidas ubicaciones anidadas dentro de los directorios copiados.
- Conservar el servicio Vite en el puerto 5173 y su proxy `/api` al backend configurado mediante el entorno de Compose.
- Documentar la selección de archivos y verificar el empaquetado con archivos testigo sin secretos reales, además de comprobar el frontend integrado.
- Declarar directamente los tipos de GeoJSON y TopoJSON importados por las fuentes y sincronizar el lockfile para corregir el fallo previo del build limpio, según la ampliación autorizada.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `frontend/frontend-runtime`: exigir un empaquetado Docker limitado a los recursos necesarios, que excluya archivos privados y artefactos locales sin alterar el acceso al frontend ni el proxy de API.

## Impact

Afecta a `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/package.json`, `frontend/pnpm-lock.yaml`, documentación del frontend y comprobaciones del empaquetado. Añade dos dependencias directas de tipos para desarrollo, reutilizando versiones ya resueltas en el lockfile. No cambia endpoints, datos ni arquitectura de despliegue. Los archivos privados del frontend dejarán de entrar en la imagen; la configuración del contenedor seguirá proporcionándose mediante variables de entorno. El desarrollo local fuera de Docker conserva sus archivos de configuración.

Quedan fuera de alcance las issues de GitHub Actions y las lecturas del catálogo geográfico, así como una migración a Nginx o una imagen de producción con múltiples etapas.
