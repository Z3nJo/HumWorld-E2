"""Fixed filesystem boundaries for geographic administrative inputs."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class GeographicInputPathError(ValueError):
    pass


def validate_geographic_input(path: Path, *, source: bool = False) -> Path:
    """Validate a regular file in an operator-owned tree (not a race sandbox)."""
    try:
        geography = BACKEND_ROOT / "data" / "geography"
        if geography.resolve(strict=True) != geography or not geography.is_dir():
            raise GeographicInputPathError("La raíz geográfica está redirigida o no es un directorio")
        root = geography / "sources" if source else geography
        if root.resolve(strict=True) != root or not root.is_dir():
            raise GeographicInputPathError("La raíz de fuentes está redirigida o no es un directorio")
        resolved = path.resolve(strict=True)
        if not resolved.is_relative_to(root) or not resolved.is_file():
            raise GeographicInputPathError("La entrada debe ser un archivo regular dentro del ámbito geográfico autorizado")
        return resolved
    except (OSError, RuntimeError, ValueError) as error:
        if isinstance(error, GeographicInputPathError):
            raise
        raise GeographicInputPathError("No se puede validar la ruta de entrada geográfica") from error
