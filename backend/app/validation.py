from urllib.parse import urlsplit


def normalize_country(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("El pais debe ser texto")
    normalized = value.strip()
    if (
        len(normalized) != 2
        or not normalized.isascii()
        or not normalized.isalpha()
    ):
        raise ValueError("El pais debe contener exactamente dos letras ASCII")
    return normalized.upper()


def normalize_site_url(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    parsed = urlsplit(text)
    if len(text) > 500 or parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError("La URL del sitio debe usar HTTP o HTTPS y no superar 500 caracteres")
    return text
