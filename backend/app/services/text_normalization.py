"""Shared, deterministic text normalization used by local recognizers."""

import re
import unicodedata


def normalize_text(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    unaccented = "".join(
        character for character in folded if not unicodedata.combining(character)
    )
    return " ".join(re.findall(r"\w+", unaccented, flags=re.UNICODE))


def tokenize(value: str) -> tuple[str, ...]:
    normalized = normalize_text(value)
    return tuple(normalized.split()) if normalized else ()
