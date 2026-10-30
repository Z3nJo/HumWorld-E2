import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

import pytest

from app.seeds import geography as seed
from app.services import geographic_input_paths as policy
from scripts import generate_geographic_catalog as generator
from tests.test_geographic_catalog_generator import _inputs


@pytest.fixture
def geography(tmp_path, monkeypatch):
    backend = (tmp_path / "backend").resolve()
    root = backend / "data" / "geography"
    (root / "sources").mkdir(parents=True)
    monkeypatch.setattr(policy, "BACKEND_ROOT", backend)
    monkeypatch.setattr(generator, "PROJECT_ROOT", backend)
    monkeypatch.setattr(generator, "OUTPUT_ROOT", root)
    monkeypatch.chdir(backend)
    return root


@pytest.mark.parametrize("source", [False, True])
@pytest.mark.parametrize("relative", [False, True])
def test_accepts_internal_file_and_subdirectories(geography, source, relative):
    path = (geography / "sources" if source else geography) / "nested" / "input.json"
    path.parent.mkdir()
    path.write_text('{}', encoding="utf-8")
    argument = path.relative_to(policy.BACKEND_ROOT) if relative else path
    assert policy.validate_geographic_input(argument, source=source) == path


@pytest.mark.parametrize("kind", ["external", "traversal", "prefix", "missing", "directory", "null", "outside-sources"])
def test_rejects_unauthorized_paths(geography, tmp_path, kind):
    outside = tmp_path / "outside.json"
    outside.write_text('{}', encoding="utf-8")
    sibling = geography / "sources-extra" / "file.json"
    sibling.parent.mkdir()
    sibling.write_text('{}', encoding="utf-8")
    paths = {
        "external": outside,
        "traversal": geography / "sources" / ".." / "sources-extra" / "file.json",
        "prefix": sibling,
        "missing": geography / "sources" / "missing.json",
        "directory": geography / "sources",
        "null": geography / "sources" / "bad\x00.json",
        "outside-sources": geography / "curation.json",
    }
    (geography / "curation.json").write_text('{}', encoding="utf-8")
    with pytest.raises(policy.GeographicInputPathError):
        policy.validate_geographic_input(paths[kind], source=True)


def symlink_or_skip(link, target, directory=False):
    try:
        link.symlink_to(target, target_is_directory=directory)
    except OSError:
        if os.name == "nt":
            pytest.skip("Windows account cannot create symbolic links")
        raise


@pytest.mark.parametrize("directory", [False, True])
def test_external_links_rejected_and_internal_links_allowed(geography, tmp_path, directory):
    external = tmp_path / "external"
    external.mkdir()
    (external / "file.json").write_text('{}', encoding="utf-8")
    link = geography / "sources" / "external-link"
    symlink_or_skip(link, external if directory else external / "file.json", directory)
    with pytest.raises(policy.GeographicInputPathError):
        policy.validate_geographic_input(link / "file.json" if directory else link, source=True)
    internal = geography / "sources" / "file.json"
    internal.write_text('{}', encoding="utf-8")
    safe_link = geography / "sources" / "internal-link"
    symlink_or_skip(safe_link, internal)
    assert policy.validate_geographic_input(safe_link, source=True) == internal


@pytest.mark.parametrize("level", ["sources", "geography", "data"])
def test_redirected_root_and_ancestor_rejected(geography, tmp_path, level):
    sources = geography / "sources"
    sources.rmdir()
    link = sources
    if level in {"geography", "data"}:
        geography.rmdir()
        link = geography
    if level == "data":
        geography.parent.rmdir()
        link = geography.parent
    external = tmp_path / "external"
    external.mkdir()
    target = external / {"sources": "input.json", "geography": "sources/input.json", "data": "geography/sources/input.json"}[level]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text('{}', encoding="utf-8")
    symlink_or_skip(link, external, True)
    with pytest.raises(policy.GeographicInputPathError, match="redirigida"):
        policy.validate_geographic_input(sources / "input.json", source=True)


@pytest.mark.skipif(os.name != "nt", reason="NTFS junctions require Windows")
def test_external_junction_rejected(geography, tmp_path):
    external = tmp_path / "external"
    external.mkdir()
    (external / "file.json").write_text('{}', encoding="utf-8")
    link = geography / "sources" / "junction"
    result = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(external)], capture_output=True)
    if result.returncode:
        pytest.skip("NTFS junction creation unavailable")
    try:
        with pytest.raises(policy.GeographicInputPathError):
            policy.validate_geographic_input(link / "file.json", source=True)
    finally:
        os.rmdir(link)


@pytest.mark.skipif(not hasattr(os, "mkfifo"), reason="FIFO creation unavailable on this platform")
def test_fifo_rejected_before_read(geography):
    path = geography / "sources" / "pipe"
    os.mkfifo(path)
    with pytest.raises(policy.GeographicInputPathError):
        policy.validate_geographic_input(path, source=True)


@pytest.mark.parametrize("reader", ["json", "text", "zip", "checksum", "seed"])
def test_direct_readers_never_open_external_files(geography, tmp_path, monkeypatch, reader):
    external = tmp_path / ("external.zip" if reader == "zip" else "external.json")
    external.write_text('{"inert": true}', encoding="utf-8")

    def forbidden_open(*args, **kwargs):
        pytest.fail("Rejected file must not be opened")

    monkeypatch.setattr(Path, "open", forbidden_open)
    with pytest.raises(policy.GeographicInputPathError):
        if reader in {"text", "zip"}:
            with generator.open_text_source(external):
                pytest.fail("Unexpected source")
        else:
            operation = {"json": generator.read_json, "checksum": generator.checksum, "seed": seed.load_catalog}[reader]
            operation(external)


def test_valid_readers_and_zip_preserve_content(geography):
    text = geography / "sources" / "cities.txt"
    text.write_bytes(b"Santiago\n")
    assert generator.checksum(text) == hashlib.sha256(text.read_bytes()).hexdigest()
    with generator.open_text_source(text) as stream:
        assert stream.read() == "Santiago\n"
    archive = geography / "sources" / "cities.zip"
    with zipfile.ZipFile(archive, "w") as output:
        output.writestr("cities.txt", "Santiago\n")
    before = set(geography.rglob("*"))
    with generator.open_text_source(archive) as stream:
        assert stream.read() == "Santiago\n"
    assert set(geography.rglob("*")) == before
    catalog = geography / "catalog.json"
    data = {"version": "test", "countries": ["CL"], "aliases": ["Chile"]}
    catalog.write_text(json.dumps(data), encoding="utf-8")
    assert generator.read_json(catalog) == seed.load_catalog(catalog) == data


@pytest.mark.parametrize("invalid", [0, 1, 2, 3])
def test_generation_validates_all_inputs_before_any_read(geography, tmp_path, monkeypatch, invalid):
    arguments = list(_inputs(tmp_path))
    optional = geography / "sources" / "optional.txt"
    optional.write_text('', encoding="utf-8")
    arguments.append(optional)
    arguments[invalid] = tmp_path / "outside.json"
    arguments[invalid].write_text('{}', encoding="utf-8")

    def forbidden_read(*args, **kwargs):
        pytest.fail("All paths must pass before reading")

    monkeypatch.setattr(generator, "read_json", forbidden_read)
    with pytest.raises(policy.GeographicInputPathError):
        generator.generate(*arguments[:3], alternate_names_path=arguments[3])


def test_cli_rejection_preserves_both_outputs(geography, tmp_path, monkeypatch):
    rest, cities, curation = _inputs(tmp_path)
    external = tmp_path / "outside.json"
    external.write_text('{}', encoding="utf-8")
    catalog, manifest = geography / "catalog.json", geography / "manifest.json"
    for path in (catalog, manifest):
        path.write_bytes(b"preserve")
    monkeypatch.setattr(sys, "argv", ["generator", "--rest-countries", str(rest), "--geonames-cities", str(cities), "--curation", str(external), "--catalog-output", str(catalog), "--manifest-output", str(manifest)])
    with pytest.raises(SystemExit) as error:
        generator.main()
    assert error.value.code == 2
    assert catalog.read_bytes() == manifest.read_bytes() == b"preserve"


def test_seed_rejects_before_database_factory(geography, tmp_path, monkeypatch):
    outside = tmp_path / "outside.json"
    outside.write_text('{}', encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["seed", "--catalog", str(outside)])
    monkeypatch.setattr(seed, "get_session_factory", lambda: pytest.fail("Database must not be initialized"))
    with pytest.raises(SystemExit) as error:
        seed.main()
    assert error.value.code == 2


def test_seed_default_does_not_require_sources():
    assert seed.load_catalog()["countries"]
