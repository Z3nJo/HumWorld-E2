"""Synchronize generated deliverable contracts from the OpenSpec source of truth."""

from __future__ import annotations

import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    PROJECT_ROOT
    / "openspec"
    / "specs"
    / "rss-source-management"
    / "spec.md"
)
DESTINATION = PROJECT_ROOT / "opsx" / "contracts" / "rss-source-management" / "spec.md"


def is_synchronized() -> bool:
    return DESTINATION.exists() and DESTINATION.read_bytes() == SOURCE.read_bytes()


def synchronize() -> None:
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    source_content = SOURCE.read_bytes()
    if not DESTINATION.exists() or DESTINATION.read_bytes() != source_content:
        DESTINATION.write_bytes(source_content)


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
    print(f"Synchronized {DESTINATION.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
