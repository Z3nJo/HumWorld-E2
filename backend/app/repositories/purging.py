from datetime import datetime

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import News


class NewsPurgeRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def delete_before(self, threshold: datetime) -> int:
        result = self._session.execute(
            delete(News).where(News.fecha_registro < threshold)
        )
        return result.rowcount or 0

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
