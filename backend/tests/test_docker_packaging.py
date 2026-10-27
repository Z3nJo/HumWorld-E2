from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_backend_image_packages_and_seeds_geographic_catalog() -> None:
    dockerfile = (BACKEND_ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert "COPY data ./data" in dockerfile
    assert "COPY scripts ./scripts" in dockerfile

    seed = "python -m app.seeds.geography --diagnose-channels"
    server = "uvicorn app.main:app"
    assert seed in dockerfile
    assert dockerfile.index(seed) < dockerfile.index(server)
