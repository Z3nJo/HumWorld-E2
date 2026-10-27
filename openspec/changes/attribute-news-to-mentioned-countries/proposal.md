## Why

HumWorld atribuye hoy cada noticia al país y continente del canal que la publicó, por lo que una noticia sobre otro territorio altera el humor del país de la fuente. El sistema necesita separar procedencia editorial y ámbito mencionado para que los agregados geográficos representen de quién habla la noticia sin modificar el cálculo de sentimiento.

## What Changes

- Incorporar un catálogo versionado con todos los códigos ISO-2 oficiales, incluidos territorios, y admitir códigos no oficiales únicamente mediante curación explícita. Sus aliases en español e inglés cubrirán nombres de país, gentilicios, ciudades con al menos 100.000 habitantes y todas las capitales, y se generarán fuera del runtime desde fuentes geográficas reproducibles para cargarse mediante un seed idempotente.
- Detectar países primero en el título y, solo cuando el título no produzca resultados, en la descripción; resolver coincidencias por tokens sin distinguir mayúsculas ni tildes, preferir la frase más larga, excluir aliases ambiguos no curados y deduplicar por país.
- Persistir la relación muchos-a-muchos entre noticia y país con procedencia `mencion` o `fuente`, evidencia opcional del alias y estado/versionado independiente del análisis de sentimiento.
- Usar el país del canal como respaldo únicamente cuando no exista una mención; cuando tampoco exista país de fuente, conservar la noticia en el continente de la fuente sin inventar un país.
- Hacer que la captura y el procesamiento de pendientes confirmen atómicamente sentimiento y atribución geográfica, y proporcionar un backfill idempotente para noticias históricas.
- Reclasificar retroactivamente las asociaciones con origen `fuente` cuando cambie la geografía de un canal, sin alterar las asociaciones originadas por menciones.
- Cambiar las consultas de dashboard para contar una noticia una vez por país atribuido, una vez por continente atribuido y una vez en consultas sin ámbito, evitando multiplicar evolución, términos y rankings por los joins muchos-a-muchos.
- Mantener la forma vigente de los endpoints y respuestas del dashboard. En noticias influyentes, `pais` y `continente` continúan describiendo la fuente editorial; los filtros usan la atribución geográfica nueva.
- **BREAKING**: validar los países de los canales contra el catálogo soportado y exigir que el país pertenezca al continente declarado, en lugar de aceptar cualquier código de dos letras.
- Mantener fuera de alcance todos los cambios de frontend, incluidos su catálogo reducido de países, la representación visual de países nuevos y el cálculo visual de noticias sin país.

## Capabilities

### New Capabilities

- `news-geographic-attribution`: catálogo geográfico, reconocimiento de menciones, persistencia y reprocesamiento de la atribución, respaldo por fuente y semántica de consumo geográfico en dashboards.

### Modified Capabilities

- `rss-news-capture`: las noticias nuevas y pendientes adquieren atribución geográfica dentro de la misma unidad atómica que su análisis.
- `rss-source-management`: el país del canal se valida contra el catálogo y las correcciones geográficas actualizan el historial atribuido por fuente.

## Impact

- **Datos:** nuevas tablas de país, alias y relación noticia-país; nuevos campos de estado/versionado geográfico en noticia; migración Alembic, seed y backfill.
- **Backend:** reconocedor geográfico puro, integración con captura, repositorios de atribución y cambios en todas las consultas geográficas del dashboard.
- **API:** se conservan las formas de respuesta del dashboard y de captura; cambia la validación de escritura de canales y fuentes con canal nuevo.
- **Rendimiento:** las consultas por país usan la relación persistida; los ámbitos continental y global deben deduplicar noticias. El reconocedor debe indexar o compilar aliases en vez de recorrer linealmente todo el catálogo por cada noticia.
- **Operación:** la aplicación y CI no dependen de GeoNames ni REST Countries en runtime; el catálogo generado, el umbral de 100.000 habitantes, la inclusión de capitales, sus overrides curados, licencias, versión y checksums quedan en el repositorio.
- **Documentación:** actualizar ADR-001, ADR-002, MOD-01 y la documentación de captura, fuentes y dashboards. La capacidad activa `t-dash-01-dashboard-aggregates` debe sincronizarse/archivarse antes de integrar este cambio para que su contrato base no siga declarando la navegación por canal.
- **Frontend:** sin cambios. Se documentan como limitaciones conocidas el catálogo visual reducido, los países detectados sin representación y la resta de conteos de países usada actualmente para inferir noticias sin país.
