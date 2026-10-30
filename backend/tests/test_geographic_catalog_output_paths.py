import json
import os
from pathlib import Path
import sys

import pytest

from scripts import generate_geographic_catalog as generator


@pytest.fixture
def output_root(tmp_path, monkeypatch):
    backend = (tmp_path / "backend").resolve()
    root = backend / "data" / "geography"
    root.mkdir(parents=True)
    monkeypatch.setattr(generator, "PROJECT_ROOT", backend)
    monkeypatch.setattr(generator, "OUTPUT_ROOT", root)
    monkeypatch.chdir(backend)
    return root


def link_or_skip(link, target, *, directory=False):
    try:
        link.symlink_to(target, target_is_directory=directory)
    except OSError:
        if os.name == "nt":
            pytest.skip("Windows user cannot create symlinks")
        raise


def cli(monkeypatch, first, second):
    monkeypatch.setattr(sys, "argv", [
        "generate_geographic_catalog.py", "--rest-countries", "unused.json",
        "--geonames-cities", "unused.txt", "--curation", "unused-curation.json",
        "--catalog-output", str(first), "--manifest-output", str(second),
    ])
    generator.main()


@pytest.mark.parametrize("relative", [True, False])
def test_valid_output_preserves_exact_serialization(output_root, relative):
    destination = output_root / "new" / "catalog.json"
    path = destination.relative_to(generator.PROJECT_ROOT) if relative else destination
    value = {"z": "América", "a": [1, 2]}
    generator.write_json(path, value)
    expected = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    assert destination.read_bytes() == expected
    assert list(destination.parent.iterdir()) == [destination]


@pytest.mark.parametrize("kind", ["absolute", "traversal", "prefix", "directory", "parent-file", "null"])
def test_rejected_output_does_not_modify_files_or_create_parents(output_root, tmp_path, kind):
    external = tmp_path / "external.json"
    external.write_bytes(b"preserve")
    destinations = {
        "absolute": external,
        "traversal": output_root / ".." / ".." / ".." / "external.json",
        "prefix": output_root.with_name("geography-extra") / "new" / "out.json",
        "directory": output_root,
        "parent-file": output_root / "not-a-directory" / "child" / "out.json",
        "null": output_root / "bad\x00.json",
    }
    (output_root / "not-a-directory").write_bytes(b"file")
    before = sorted(str(path.relative_to(tmp_path)) for path in tmp_path.rglob("*"))
    with pytest.raises(generator.CatalogGenerationError):
        generator.write_json(destinations[kind], {"changed": True})
    assert external.read_bytes() == b"preserve"
    assert sorted(str(path.relative_to(tmp_path)) for path in tmp_path.rglob("*")) == before


@pytest.mark.parametrize("directory", [False, True])
def test_rejects_symlink_escape(output_root, tmp_path, directory):
    external = tmp_path / "external"
    external.mkdir()
    original = external / "original.json"
    original.write_bytes(b"preserve")
    link = output_root / "link"
    link_or_skip(link, external if directory else original, directory=directory)
    destination = link / "new" / "out.json" if directory else link
    with pytest.raises(generator.CatalogGenerationError):
        generator.write_json(destination, {})
    assert original.read_bytes() == b"preserve"
    assert not (external / "new").exists()


def test_rejects_redirected_root(output_root, tmp_path):
    output_root.rmdir()
    external = tmp_path / "external"
    external.mkdir()
    link_or_skip(output_root, external, directory=True)
    with pytest.raises(generator.CatalogGenerationError, match="redirigida"):
        generator.write_json(output_root / "catalog.json", {})
    assert not list(external.iterdir())


def test_rejects_redirected_data_parent(output_root, tmp_path):
    output_root.rmdir()
    output_root.parent.rmdir()
    external = tmp_path / "external"
    external.mkdir()
    link_or_skip(output_root.parent, external, directory=True)
    with pytest.raises(generator.CatalogGenerationError, match="redirigida"):
        generator.write_json(output_root / "catalog.json", {})
    assert not list(external.iterdir())


def test_hard_link_does_not_modify_external_inode(output_root, tmp_path):
    external = tmp_path / "original.json"
    external.write_bytes(b"preserve")
    destination = output_root / "catalog.json"
    destination.hardlink_to(external)
    generator.write_json(destination, {"updated": True})
    assert external.read_bytes() == b"preserve"
    assert json.loads(destination.read_text()) == {"updated": True}
    assert not destination.samefile(external)


def test_failed_replace_preserves_output_and_cleans_temporary(output_root, monkeypatch):
    destination = output_root / "catalog.json"
    destination.write_bytes(b"preserve")

    def fail(*_):
        raise OSError("simulated publication failure")

    monkeypatch.setattr(generator.os, "replace", fail)
    with pytest.raises(OSError, match="publication failure"):
        generator.write_json(destination, {})
    assert destination.read_bytes() == b"preserve"
    assert list(output_root.iterdir()) == [destination]


@pytest.mark.parametrize("first_exists", [False, True])
def test_cli_prevalidates_second_destination(output_root, tmp_path, monkeypatch, capsys, first_exists):
    first = output_root / ("catalog.json" if first_exists else "new/catalog.json")
    if first_exists:
        first.write_bytes(b"preserve")
    external = tmp_path / "external.json"
    external.write_bytes(b"external")

    def unexpected(*_, **__):
        pytest.fail("Invalid output paths must fail before generating")

    monkeypatch.setattr(generator, "generate", unexpected)
    with pytest.raises(SystemExit) as error:
        cli(monkeypatch, first, external)
    assert error.value.code != 0
    assert "data/geography" in capsys.readouterr().err
    if first_exists:
        assert first.read_bytes() == b"preserve"
    else:
        assert not first.parent.exists()
    assert external.read_bytes() == b"external"
    assert not list(output_root.glob(".geography-*"))


@pytest.mark.parametrize("alias", ["same", "normalized", "hardlink"])
def test_cli_rejects_coincident_outputs(output_root, monkeypatch, alias):
    first = output_root / "catalog.json"
    first.write_bytes(b"preserve")
    second = first
    if alias == "normalized":
        second = output_root / ".." / "geography" / "catalog.json"
    elif alias == "hardlink":
        second = output_root / "manifest.json"
        second.hardlink_to(first)
    with pytest.raises(SystemExit) as error:
        cli(monkeypatch, first, second)
    assert error.value.code != 0
    assert first.read_bytes() == b"preserve"
    assert second.read_bytes() == b"preserve"


def test_cli_rejects_invalid_second_parent_before_first_write(output_root, monkeypatch):
    first = output_root / "catalog.json"
    first.write_bytes(b"preserve")
    parent_file = output_root / "file"
    parent_file.write_bytes(b"parent")
    with pytest.raises(SystemExit):
        cli(monkeypatch, first, parent_file / "manifest.json")
    assert first.read_bytes() == b"preserve"


@pytest.mark.parametrize("reverse", [False, True])
def test_cli_rejects_outputs_nested_inside_each_other(output_root, monkeypatch, reverse):
    parent = output_root / "new"
    child = parent / "manifest.json"
    first, second = (child, parent) if reverse else (parent, child)
    with pytest.raises(SystemExit):
        cli(monkeypatch, first, second)
    assert not parent.exists()


def test_documented_cli_writes_two_internal_outputs(output_root, monkeypatch):
    catalog, manifest = {"aliases": ["Chile"]}, {"counts": {"aliases": 1}}
    monkeypatch.setattr(generator, "generate", lambda *_, **__: (catalog, manifest))
    cli(monkeypatch, Path("data/geography/catalog.json"), Path("data/geography/manifest.json"))
    assert json.loads((output_root / "catalog.json").read_text()) == catalog
    assert json.loads((output_root / "manifest.json").read_text()) == manifest
