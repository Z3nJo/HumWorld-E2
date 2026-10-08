"""Synchronize generated deliverable contracts from the OpenSpec source of truth."""

from __future__ import annotations

import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = {
    "rss-news-capture": (
        PROJECT_ROOT / "openspec" / "specs" / "rss-news-capture" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "rss-news-capture" / "spec.md",
    ),
    "rss-source-management": (
        PROJECT_ROOT / "openspec" / "specs" / "rss-source-management" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "rss-source-management" / "spec.md",
    ),
    "runtime-configuration": (
        PROJECT_ROOT / "openspec" / "specs" / "runtime-configuration" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "runtime-configuration" / "spec.md",
    ),
    "integration-verification": (
        PROJECT_ROOT / "openspec" / "specs" / "integration-verification" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "integration-verification" / "spec.md",
    ),
    "news-sentiment-analysis": (
        PROJECT_ROOT / "openspec" / "specs" / "news-sentiment-analysis" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "news-sentiment-analysis" / "spec.md",
    ),
    "news-purging": (
        PROJECT_ROOT / "openspec" / "specs" / "news-purging" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "news-purging" / "spec.md",
    ),
    "dictionary-management": (
        PROJECT_ROOT / "openspec" / "specs" / "dictionary-management" / "spec.md",
        PROJECT_ROOT / "opsx" / "contracts" / "dictionary-management" / "spec.md",
    ),
}


def nested_openspec_roots() -> list[Path]:
    """Return OpenSpec directories below the canonical repository root."""
    canonical = (PROJECT_ROOT / "openspec").resolve()
    return sorted(
        path.resolve()
        for path in PROJECT_ROOT.rglob("openspec")
        if path.is_dir() and path.resolve() != canonical
    )


def is_synchronized() -> bool:
    return all(
        destination.exists() and destination.read_bytes() == source.read_bytes()
        for source, destination in CONTRACTS.values()
    )


def synchronize() -> None:
    for source, destination in CONTRACTS.values():
        destination.parent.mkdir(parents=True, exist_ok=True)
        source_content = source.read_bytes()
        if not destination.exists() or destination.read_bytes() != source_content:
            destination.write_bytes(source_content)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail when the generated contract differs from OpenSpec.",
    )
    args = parser.parse_args()
    nested = nested_openspec_roots()
    if nested:
        print("Unexpected nested OpenSpec root(s):")
        for path in nested:
            print(f"- {path.relative_to(PROJECT_ROOT)}")
        return 1
    if args.check:
        if is_synchronized():
            print("OpenSpec contracts are synchronized")
            return 0
        print("OpenSpec contracts are out of date")
        return 1
    synchronize()
    print("Synchronized OpenSpec contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
