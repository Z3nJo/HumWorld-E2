from app.api.configuration import router as configuration_router
from app.api.dictionary import router as dictionary_router
from app.api.sentiment import router as sentiment_router
from app.api.sources import router as sources_router

__all__ = [
    "configuration_router",
    "dictionary_router",
    "sentiment_router",
    "sources_router",
]
