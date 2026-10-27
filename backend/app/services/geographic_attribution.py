"""Pure geographic alias matching and news attribution."""

from dataclasses import dataclass, field
from typing import Sequence

from app.services.text_normalization import tokenize


class GeographicCatalogError(ValueError):
    pass


@dataclass(frozen=True)
class GeographicAlias:
    id_alias: int
    alias: str
    idioma: str
    codigo_pais: str
    tipo: str
    activo: bool = True


@dataclass(frozen=True)
class GeographicMatch:
    id_alias: int
    codigo_pais: str
    token_count: int
    start: int


@dataclass(frozen=True)
class CountryAttribution:
    codigo_pais: str
    origen: str
    id_alias: int | None = None
    campo: str | None = None


@dataclass(frozen=True)
class GeographicAttributionResult:
    countries: tuple[CountryAttribution, ...]


@dataclass
class _TrieNode:
    children: dict[str, "_TrieNode"] = field(default_factory=dict)
    aliases: list[GeographicAlias] = field(default_factory=list)


class GeographicMatcher:
    """Token trie with longest-match semantics at each text position."""

    def __init__(
        self, aliases: Sequence[GeographicAlias], *, version: str
    ) -> None:
        if not version.strip():
            raise GeographicCatalogError("El catálogo geográfico no tiene versión")
        active = [item for item in aliases if item.activo]
        if not active:
            raise GeographicCatalogError("El catálogo geográfico no contiene aliases activos")
        self.version = version
        self._roots: dict[str, _TrieNode] = {}
        seen: dict[tuple[str, tuple[str, ...]], str] = {}
        for item in sorted(active, key=lambda value: value.id_alias):
            if item.idioma not in {"es", "en"}:
                raise GeographicCatalogError(f"Idioma de alias no soportado: {item.idioma}")
            words = tokenize(item.alias)
            if not words:
                raise GeographicCatalogError(f"Alias vacío: {item.id_alias}")
            key = (item.idioma, words)
            previous = seen.get(key)
            if previous is not None and previous != item.codigo_pais:
                raise GeographicCatalogError(
                    f"Alias ambiguo no resuelto: {' '.join(words)}"
                )
            seen[key] = item.codigo_pais
            node = self._roots.setdefault(item.idioma, _TrieNode())
            for word in words:
                node = node.children.setdefault(word, _TrieNode())
            node.aliases.append(item)

    def match(self, text: str | None, language: str) -> tuple[GeographicMatch, ...]:
        if not text:
            return ()
        root = self._roots.get(language)
        if root is None:
            return ()
        words = tokenize(text)
        matches: list[GeographicMatch] = []
        start = 0
        while start < len(words):
            node = root
            longest: tuple[int, list[GeographicAlias]] | None = None
            for end in range(start, len(words)):
                node = node.children.get(words[end])
                if node is None:
                    break
                if node.aliases:
                    longest = (end - start + 1, node.aliases)
            if longest is None:
                start += 1
                continue
            token_count, aliases = longest
            matches.extend(
                GeographicMatch(
                    id_alias=item.id_alias,
                    codigo_pais=item.codigo_pais,
                    token_count=token_count,
                    start=start,
                )
                for item in aliases
            )
            start += token_count
        return tuple(matches)


class GeographicAttributionService:
    def __init__(self, matcher: GeographicMatcher, country_codes: Sequence[str]) -> None:
        self.matcher = matcher
        self._country_codes = frozenset(code.upper() for code in country_codes)
        if not self._country_codes:
            raise GeographicCatalogError("El catálogo geográfico no contiene países")

    def classify(
        self,
        *,
        title: str,
        description: str | None,
        language: str,
        source_country: str | None,
    ) -> GeographicAttributionResult:
        matches = self.matcher.match(title, language)
        field_name = "titulo"
        if not matches:
            matches = self.matcher.match(description, language)
            field_name = "descripcion"

        if matches:
            best_by_country: dict[str, GeographicMatch] = {}
            for item in matches:
                previous = best_by_country.get(item.codigo_pais)
                if previous is None or (-item.token_count, item.id_alias) < (
                    -previous.token_count,
                    previous.id_alias,
                ):
                    best_by_country[item.codigo_pais] = item
            countries = tuple(
                CountryAttribution(
                    codigo_pais=code,
                    origen="mencion",
                    id_alias=item.id_alias,
                    campo=field_name,
                )
                for code, item in sorted(best_by_country.items())
            )
            return GeographicAttributionResult(countries)

        if source_country is None:
            return GeographicAttributionResult(())
        normalized = source_country.upper()
        if normalized not in self._country_codes:
            raise GeographicCatalogError(
                f"País de la fuente ausente del catálogo: {normalized}"
            )
        return GeographicAttributionResult(
            (CountryAttribution(codigo_pais=normalized, origen="fuente"),)
        )
