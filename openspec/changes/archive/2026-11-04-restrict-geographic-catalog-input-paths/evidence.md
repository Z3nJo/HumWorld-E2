# Evidencia de validación de entradas geográficas

Fecha: 2026-10-30. Cambio aplicado localmente, todavía sin publicar en una PR propia ni analizar en Sonar remoto.

## Implementación

- Política compartida en `backend/app/services/geographic_input_paths.py`, anclada al backend instalado. Las fuentes REST Countries y GeoNames se limitan a `data/geography/sources`; curación, catálogo del seed y lectores genéricos se limitan a `data/geography`.
- Existencia requerida, resolución de enlaces, pertenencia por componentes, archivo regular y raíces no redirigidas. Se abre la ruta validada; no se introdujo una opción CLI o de entorno para ampliar el ámbito.
- `generate` valida todas las entradas, incluida la opcional, antes de leer la primera. JSON, texto/ZIP y checksum también validan al invocarlos directamente.
- `load_catalog` valida siempre y el CLI carga el catálogo antes de crear la sesión del seed.
- Se actualizaron fixtures, documentación, directorio de fuentes y exclusiones precisas de Git/Docker. No se modificaron catálogo, manifiesto, fórmulas de humor ni endpoints de fuentes RSS.

## Windows

Python 3.14 del entorno local:

```powershell
cd backend
.venv/Scripts/python.exe -m pytest tests/test_geographic_input_paths.py tests/test_geographic_catalog_generator.py -q
```

Resultado: **27 aprobadas, 6 omitidas**. Las omisiones corresponden a enlaces simbólicos sin privilegios y FIFO no disponible. La prueba de junction NTFS sí se ejecutó y pasó, incluyendo su retirada sin borrar el destino externo.

La ejecución adicional de las pruebas anteriores de salida encontró un fallo previo en el caso `bad\x00.json`: `os.replace` emite `ValueError` en Windows en lugar del error de dominio esperado. Se cargó la versión de `generate_geographic_catalog.py` de `HEAD` mediante `git show`, se repitió ese caso y falló del mismo modo. No se modificó la política de escritura para resolver un problema ajeno al alcance. Esto limita la validación de esa prueba anterior en Windows; no se presenta como superada.

## Linux Docker y PostgreSQL desechable

Se construyó la imagen desde un contexto temporal con los archivos versionados actuales y los módulos/pruebas nuevos, sin copiar `.env` privados. Se crearon una red, contenedores y una contraseña aleatoria de prueba independiente de la aplicación habitual. La contraseña se transmitió mediante el entorno de procesos y no se registró en esta evidencia.

El contenedor de pruebas recibió las pruebas, `pytest.ini` y el Dockerfile para las comprobaciones estáticas de empaquetado. El primer ensayo omitía ese último archivo del entorno de prueba y falló únicamente esa comprobación; se corrigió la preparación del entorno y se repitió la suite con las fuentes finales.

Comandos principales dentro del contenedor de pruebas:

```text
alembic upgrade head
python -m pytest --cov=. --cov-report=term-missing --cov-fail-under=80 -q
```

Las pruebas incluyen rutas internas absolutas/relativas, subdirectorios, escapes, prefijos hermanos, límites de fuentes, ausencia de archivos, archivos especiales, lectura directa de los cuatro puntos, validación previa a cualquier lectura, rechazo CLI sin publicar y rechazo del seed antes de crear sesión. Los ZIP autorizados se leen sin extracción.

Resultado final: **342 aprobadas, 1 omitida, cobertura 97,25 %** (umbral requerido 80 %), duración 38,95 s. La omitida es la prueba de junction exclusiva de Windows, ejecutada satisfactoriamente en el ensayo Windows. En Linux sí se ejecutaron los casos de symlinks, raíces redirigidas y FIFO, incluida la comprobación de redirección hacia un archivo externo existente.

Para el arranque se creó una segunda base vacía en el PostgreSQL desechable y se inició el comando original de la imagen: migraciones, seed y Uvicorn. Se verificó que `data/geography/sources` no estaba en la imagen. Repetir el seed conservó **249 países y 15.908 aliases**. GET de `/api/v1/config`, `/api/v1/dashboards/evolucion`, `/api/v1/dashboards/geografia?fecha_desde=2026-10-30&fecha_hasta=2026-10-30` y `/api/v1/sources` respondió HTTP 200 con JSON válido.

Se retiraron los contenedores desechables, sus volúmenes anónimos, la red de comprobación, la etiqueta de imagen, el contexto y el script temporal. No se reiniciaron ni modificaron los tres servicios habituales ni su volumen de datos.

## Comprobaciones adicionales y límites

- `python opsx/sync_contracts.py --check`: contratos sincronizados.
- `git diff --check`: correcto.
- `git check-ignore` confirma exclusión de datasets en `sources` y conservación de su README.
- `git diff` no muestra cambios en `catalog.json` ni `manifest.json`.
- El árbol autorizado debe estar controlado por el operador. Esta validación no es un sandbox frente a intercambios concurrentes ni determina la procedencia de hard links o la autenticidad de datasets.
- La tarea de CI y de las cuatro issues de Sonar permanece pendiente de una PR autorizada y análisis de su revisión exacta. No se han suprimido reglas ni modificado estados de issues.
