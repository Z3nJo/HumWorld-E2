from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.schemas import ErrorResponse
from app.database import get_db
from app.repositories import ConfigurationRepository, NewsPurgeRepository
from app.services.configuration import ConfigurationService
from app.services.purging import NewsPurgeApplicationService, NewsPurgeService

router = APIRouter(prefix="/news", tags=["news"])
ERROR_RESPONSES = {
    500: {"model": ErrorResponse, "description": "Error interno"},
}


def get_news_purge_service(
    session: Annotated[Session, Depends(get_db)],
) -> NewsPurgeApplicationService:
    return NewsPurgeApplicationService(
        ConfigurationService(ConfigurationRepository(session)),
        NewsPurgeService(NewsPurgeRepository(session)),
    )


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Purgar manualmente noticias caducadas",
    responses=ERROR_RESPONSES,
)
def purge_expired_news(
    service: Annotated[NewsPurgeApplicationService, Depends(get_news_purge_service)],
) -> Response:
    service.purge_expired()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
