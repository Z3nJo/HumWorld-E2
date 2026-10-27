# Medición del reconocedor geográfico

Medición local del 27-10-2026 con Python 3.12 y el catálogo `2026-10-27.v1`:

- 14.924 aliases compilados en trie: 104,834 ms.
- 1.000 textos representativos clasificados: 11,523 ms.
- 1.250 coincidencias producidas.

La compilación recorre el catálogo una vez por versión. La clasificación recorre los tokens del texto y las ramas coincidentes del trie; no itera todos los aliases por cada posición. La implementación usa únicamente la biblioteca estándar y no añade dependencias.

Comando reproducible:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\benchmark_geographic_matcher.py
```
