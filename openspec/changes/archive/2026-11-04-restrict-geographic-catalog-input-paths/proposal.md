## Why

Las lecturas del generador geográfico y del seed reciben rutas de consola sin comprobar un ámbito autorizado. Los cuatro hallazgos High de Sonar señalan la posibilidad de abrir archivos ajenos a las fuentes previstas mediante rutas externas o enlaces.

## What Changes

- Limitar REST Countries y GeoNames a `backend/data/geography/sources`, y curación y catálogos del seed a `backend/data/geography`, con raíces fijas ancladas al backend instalado.
- Validar rutas resueltas, pertenencia al directorio autorizado y archivos regulares existentes antes de abrirlos; rechazar escapes por rutas absolutas, `..`, enlaces simbólicos, junctions o redirección de la raíz.
- Proteger también las llamadas directas de lectura y checksum, validar todas las entradas del generador antes de leer la primera y rechazar un catálogo externo antes de iniciar el seed.
- Conservar el catálogo predeterminado del arranque Docker, la generación determinista, la carga idempotente y el procesamiento geográfico habitual.
- **BREAKING (CLI):** las fuentes externas deberán copiarse primero a `data/geography/sources`; ya no se admitirán entradas arbitrarias fuera de los ámbitos fijos. Actualizar documentación y pruebas para este contrato.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `news-geographic-attribution`: añadir un requisito de lectura de entradas geográficas dentro de ámbitos fijos y conservar la generación y carga válidas.

## Impact

Afecta a `backend/scripts/generate_geographic_catalog.py`, `backend/app/seeds/geography.py`, un validador compartido de rutas, pruebas geográficas y documentación del catálogo. Contempla reglas de exclusión para las fuentes locales descargadas, sin versionar datasets grandes ni credenciales. No cambia endpoints, cálculos de humor, rutas del frontend, esquema de base de datos ni destinos de salida ya protegidos.

La corrección aborda `read_json`, `open_text_source`, `checksum` y `load_catalog`. El cierre de las issues se comprobará en el análisis remoto de la revisión publicada, sin suprimir reglas de Sonar. No incluye nuevas funcionalidades HTTP, descargas automáticas, ampliación del ámbito mediante argumentos o variables de entorno, ni un sandbox contra modificaciones concurrentes del sistema de archivos.
