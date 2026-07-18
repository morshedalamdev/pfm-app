from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

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
    application.add_middleware(
        SessionMiddleware,
        secret_key=app_settings.oauth_state_secret_key.get_secret_value(),
        session_cookie="pfm_oauth_state",
        max_age=app_settings.oauth_registration_ticket_expire_minutes * 60,
        path=f"{app_settings.api_v1_prefix.rstrip('/')}/auth/oauth",
        same_site="lax",
        https_only=app_settings.app_env in {"staging", "production"},
    )
    register_exception_handlers(application)
    application.include_router(api_router, prefix=app_settings.api_v1_prefix)

    def get_app_settings() -> Settings:
        return app_settings

    application.dependency_overrides[get_settings] = get_app_settings
    return application


app = create_app()
