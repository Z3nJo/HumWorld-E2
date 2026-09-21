# Evidencia de validacion: reemplazo de CBC por PBS

Fecha: 20 de septiembre de 2026.

## Alcance

Se reemplazo la fuente inoperativa de CBC para America por PBS NewsHour
Headlines (`https://www.pbs.org/newshour/feeds/rss/headlines`). La
reconciliacion actualiza en sitio los registros legados para conservar
`id_canal`, `id_fuente` y las noticias relacionadas.

## Pruebas automatizadas

Las migraciones se aplicaron sobre PostgreSQL 16 efimero y aislado. Luego se
ejecutaron las pruebas unitarias y de integracion del seed:

```text
13 passed in 1.29s
```

La verificacion cubrio:

- seis fuentes unicas y una por continente en una base limpia;
- datos exactos de PBS para America;
- actualizacion CBC a PBS conservando identificadores y noticias;
- segunda ejecucion sin registros adicionales;
- rollback completo cuando CBC y PBS coexisten de forma incompatible.

## Validacion del feed dentro de Docker

Se construyo la imagen del backend con el codigo actual y se consulto PBS con
`HttpxFeedparserClient`, aplicando las reglas de campos y longitudes usadas por
la captura:

```text
status=200 entries=20 usable=20
```

La consulta externa se mantiene como validacion manual y no forma parte de CI.
