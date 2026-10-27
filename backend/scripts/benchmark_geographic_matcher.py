import json
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.seeds.geography import DEFAULT_CATALOG
from app.services.geographic_attribution import GeographicAlias, GeographicMatcher


def main() -> None:
    with DEFAULT_CATALOG.open(encoding="utf-8") as source:
        catalog = json.load(source)
    aliases = [
        GeographicAlias(
            index,
            item["alias"],
            item["idioma"],
            item["codigo_pais"],
            item["tipo"],
        )
        for index, item in enumerate(catalog["aliases"], start=1)
    ]
    started = time.perf_counter()
    matcher = GeographicMatcher(aliases, version=catalog["version"])
    compile_ms = (time.perf_counter() - started) * 1000
    samples = [
        ("Crisis en Santiago y Buenos Aires", "es"),
        ("Elections in New York and Washington", "en"),
        ("Ucrania y Chile firman acuerdo", "es"),
        ("Mercados avanzan sin lugar mencionado", "es"),
    ] * 250
    started = time.perf_counter()
    matches = sum(len(matcher.match(text, language)) for text, language in samples)
    classify_ms = (time.perf_counter() - started) * 1000
    print(
        f"aliases={len(aliases)} compile_ms={compile_ms:.3f} "
        f"texts={len(samples)} classify_ms={classify_ms:.3f} matches={matches}"
    )


if __name__ == "__main__":
    main()
