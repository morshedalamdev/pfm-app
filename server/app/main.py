from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(debug=app_settings.debug)

    application = FastAPI(
        title=app_settings.app_name,
        version=__version__,
        description="Personal finance management API.",
        debug=app_settings.debug,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(application)
    application.include_router(api_router, prefix=app_settings.api_v1_prefix)

    def get_app_settings() -> Settings:
        return app_settings

    application.dependency_overrides[get_settings] = get_app_settings
    return application


app = create_app()
