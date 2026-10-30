# Catálogo geográfico

`catalog.json` es el único artefacto consumido por el seed y por tanto la fuente reproducible del runtime. Incluye todos los códigos ISO-2 oficiales presentes en la fuente fijada, territorios incluidos, países, capitales, ciudades GeoNames con población mínima de 100.000 y nombres alternativos `es/en`. Los códigos no oficiales se excluyen salvo `unofficial_inclusions` explícito.

`geography-curation.v1.json` es la única vía admitida para gentilicios, exclusiones, aliases adicionales, inclusiones no oficiales, resoluciones ambiguas y continentes transcontinentales. `manifest.json` registra versión, fecha, licencias, URLs, checksums, umbral y conteos. GeoNames se usa bajo CC BY 4.0 y REST Countries bajo MPL 2.0.

La generación necesita copias locales de las fuentes; no se ejecuta durante el arranque ni en la clasificación:

```powershell
python scripts/generate_geographic_catalog.py `
  --rest-countries data/geography/sources/rest-countries.json `
  --geonames-cities data/geography/sources/cities15000.txt `
  --geonames-alternate-names data/geography/sources/alternateNamesV2.zip `
  --curation data/geography/geography-curation.v1.json `
  --catalog-output data/geography/catalog.json `
  --manifest-output data/geography/manifest.json
```

Limitaciones deliberadas: no hay NER ni desambiguación contextual; los aliases ambiguos se excluyen salvo override; título tiene prioridad absoluta sobre descripción; no se extrae el cuerpo remoto del artículo.

## Destinos de salida autorizados

El generador solo publica catálogo y manifiesto dentro de `data/geography` del
backend instalado (en Docker, `/app/data/geography`). Admite archivos distintos
en ese directorio o sus subdirectorios; no existe una opción CLI ni variable de
entorno para ampliar el ámbito. Las rutas relativas siguen siendo relativas al
directorio de trabajo: el comando anterior se ejecuta desde `backend/`.

Se admiten rutas absolutas internas. Se rechazan destinos externos, incluidos los
que escapan mediante `..`, enlaces simbólicos o junctions y directorios hermanos
como `data/geography-extra`. Tampoco se permite que ambas salidas sean el mismo
archivo ni que una sea el directorio padre de la otra.

Por ejemplo, `--catalog-output ../catalog.json` desde `backend/` falla con un
diagnóstico y código de salida no cero. Ambos destinos se validan antes de crear
directorios o escribir: un manifiesto inválido no modifica un catálogo existente.
La validación también protege la operación de escritura invocada desde Python.

Cada JSON se publica mediante un temporal seguro en su directorio y reemplazo del
archivo final; conserva UTF-8, formato y orden deterministas. Los dos archivos no
son una transacción conjunta frente a errores de disco durante la publicación.
El árbol de salida debe permanecer controlado por el operador durante la ejecución;
esta protección no es un sandbox contra modificaciones concurrentes de directorios.

Para exportar a otra ubicación, generar primero dentro del ámbito y después copiar
los resultados explícitamente.

## Entradas autorizadas

Ejecutar el comando desde `backend/` y copiar previamente REST Countries y GeoNames
a `data/geography/sources` (se admiten subdirectorios). La curación y el catálogo
del seed deben estar en `data/geography`. Las raíces se anclan al backend instalado;
no hay argumentos ni variables de entorno para ampliarlas. Se admiten rutas
absolutas internas y relativas al directorio de trabajo. Los datasets descargados
se excluyen de Git y de la imagen Docker habitual.

Las entradas deben existir y ser archivos regulares. Se rechazan rutas externas,
directorios hermanos con prefijo común, enlaces que escapen del ámbito y raíces
redirigidas. Todas las entradas del generador se validan antes de la primera
lectura; un catálogo inválido se rechaza antes de iniciar el seed. El arranque
Docker conserva `data/geography/catalog.json` y no necesita los datasets fuente.

El operador debe controlar el árbol durante la ejecución. La validación no es un
sandbox frente a intercambios concurrentes de directorios o hard links externos,
ni demuestra la autenticidad del contenido de fuentes autorizadas.
