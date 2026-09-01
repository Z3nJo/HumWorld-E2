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
}


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
