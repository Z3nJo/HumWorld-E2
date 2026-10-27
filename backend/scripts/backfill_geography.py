"""Reanudable batch backfill for geographic news attribution."""

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import get_session_factory
from app.repositories import NewsCaptureRepository
from app.services.capture import HttpxFeedparserClient, NewsCaptureService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--batch-size", type=int, default=100)
    arguments = parser.parse_args()
    if arguments.batch_size < 1:
        parser.error("--batch-size debe ser positivo")

    total = 0
    with get_session_factory()() as session:
        service = NewsCaptureService(
            NewsCaptureRepository(session), HttpxFeedparserClient()
        )
        while True:
            processed = sum(
                service.process_pending_geographic_news(
                    language=language,
                    limit=arguments.batch_size,
                    version=arguments.version,
                )
                for language in ("es", "en")
            )
            total += processed
            if processed == 0:
                break
    print(f"Backfill geográfico {arguments.version}: {total} noticias procesadas")


if __name__ == "__main__":
    main()
