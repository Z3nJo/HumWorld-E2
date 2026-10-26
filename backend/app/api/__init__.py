from app.api.channels import router as channels_router
from app.api.configuration import router as configuration_router
from app.api.dashboards import dashboard_router
from app.api.dictionary import router as dictionary_router
from app.api.news import router as news_router
from app.api.sentiment import router as sentiment_router
from app.api.sources import router as sources_router

__all__ = [
    "channels_router",
    "configuration_router",
    "dashboard_router",
    "dictionary_router",
    "news_router",
    "sentiment_router",
    "sources_router",
]
