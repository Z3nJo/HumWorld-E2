# Catálogo geográfico

`catalog.json` es el único artefacto consumido por el seed y por tanto la fuente reproducible del runtime. Incluye todos los códigos ISO-2 oficiales presentes en la fuente fijada, territorios incluidos, países, capitales, ciudades GeoNames con población mínima de 100.000 y nombres alternativos `es/en`. Los códigos no oficiales se excluyen salvo `unofficial_inclusions` explícito.

`geography-curation.v1.json` es la única vía admitida para gentilicios, exclusiones, aliases adicionales, inclusiones no oficiales, resoluciones ambiguas y continentes transcontinentales. `manifest.json` registra versión, fecha, licencias, URLs, checksums, umbral y conteos. GeoNames se usa bajo CC BY 4.0 y REST Countries bajo MPL 2.0.

La generación necesita copias locales de las fuentes; no se ejecuta durante el arranque ni en la clasificación:

```powershell
python scripts/generate_geographic_catalog.py `
  --rest-countries ruta/rest-countries.json `
  --geonames-cities ruta/cities15000.txt `
  --geonames-alternate-names ruta/alternateNamesV2.zip `
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
los resultados explícitamente. Las fuentes de entrada no cambian en esta corrección.
