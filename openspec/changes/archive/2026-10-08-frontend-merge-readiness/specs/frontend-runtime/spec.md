# Spec Delta

## Purpose

Proporciona una ejecución local reproducible del frontend React dentro del entorno Docker del proyecto. La capacidad garantiza que la interfaz sea accesible desde el host y que sus llamadas relativas a la API alcancen el backend del compose.

## ADDED Requirements

### Requirement: Servicio frontend accesible en Docker

El servicio frontend SHALL construir e iniciar la aplicación React dentro de Docker y SHALL servirla en `0.0.0.0:5173`, accesible desde el host mediante `http://localhost:5173/`.

#### Scenario: Abrir la aplicación después de reconstruir Docker
- **WHEN** el usuario ejecuta `docker compose -f opsx/docker-compose.yml up --build`
- **THEN** una solicitud a `http://localhost:5173/` recibe la aplicación frontend sin `ERR_EMPTY_RESPONSE`

### Requirement: Proxy de API entre servicios

El servicio frontend SHALL enrutar las solicitudes relativas `/api` al servicio backend del entorno Docker usando el puerto 3000, sin exigir una URL absoluta en el navegador.

#### Scenario: Consultar el diccionario desde Docker
- **WHEN** la aplicación cargada en `http://localhost:5173/` solicita `/api/v1/dictionary`
- **THEN** la solicitud se entrega al backend del compose y la UI puede procesar su respuesta
