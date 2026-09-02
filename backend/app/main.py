import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.api import configuration_router, sources_router
from app.config import get_settings
from app.scheduler import CaptureScheduler, read_capture_periodicity
from app.services.configuration import ConfigurationValidationError, NullCaptureSchedule
from app.services.sources import ResourceNotFoundError, SourceValidationError
from app.services.capture import CaptureSourceNotFoundError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    scheduler: CaptureScheduler | NullCaptureSchedule
    if get_settings().capture_scheduler_enabled:
        scheduler = CaptureScheduler()
        scheduler.start(read_capture_periodicity())
    else:
        scheduler = NullCaptureSchedule()
    application.state.capture_scheduler = scheduler
    try:
        yield
    finally:
        if isinstance(scheduler, CaptureScheduler):
            scheduler.shutdown()

app = FastAPI(
    title="HumWorld API",
    description="API REST del proyecto HumWorld",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.include_router(configuration_router, prefix="/api/v1")
app.include_router(sources_router, prefix="/api/v1")


def generated_openapi() -> dict[str, Any]:
    """Generate the contract and align validation responses with the API's 400 policy."""
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.get("responses", {}).pop("422", None)
    component_schemas = schema.get("components", {}).get("schemas", {})
    component_schemas.pop("HTTPValidationError", None)
    component_schemas.pop("ValidationError", None)
    app.openapi_schema = schema
    return schema


app.openapi = generated_openapi  # type: ignore[method-assign]


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=jsonable_encoder({"detail": error.errors()}),
    )


@app.exception_handler(SourceValidationError)
async def source_validation_error_handler(
    request: Request,
    error: SourceValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(error)},
    )


@app.exception_handler(ConfigurationValidationError)
async def configuration_validation_error_handler(
    request: Request,
    error: ConfigurationValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(error)},
    )


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_error_handler(
    request: Request,
    error: ResourceNotFoundError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(error)},
    )


@app.exception_handler(CaptureSourceNotFoundError)
async def capture_source_not_found_handler(
    request: Request,
    error: CaptureSourceNotFoundError,
) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(error)})


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unexpected API error", exc_info=error)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )
