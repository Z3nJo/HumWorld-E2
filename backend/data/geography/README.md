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
