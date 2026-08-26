from fastapi import FastAPI

app = FastAPI(
    title="HumWorld API",
    description="API REST del proyecto HumWorld",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    servers=[
        {
            "url": "/api/v1",
            "description": "API principal de HumWorld",
        }
    ],
)