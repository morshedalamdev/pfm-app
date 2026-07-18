import logging

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app import __version__
from app.api.v1.health import database_is_ready
from app.core.config import Settings
from app.main import create_app


def build_test_app() -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
        ),
    )


def test_application_starts() -> None:
    with TestClient(build_test_app()) as client:
        response = client.get("/api/v1/health/live")

    assert response.status_code == 200


@pytest.mark.parametrize(
    "origin",
    ["http://localhost:3000", "http://127.0.0.1:3000"],
)
def test_local_browser_origins_pass_cors_preflight(origin: str) -> None:
    app = create_app(
        Settings(
            app_env="test",
            cors_origins=[
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ],
        )
    )

    with TestClient(app) as client:
        response = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_openapi_metadata_and_versioned_route() -> None:
    with TestClient(build_test_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "PFM Test API"
    assert schema["info"]["version"] == __version__
    assert "/api/v1/health/live" in schema["paths"]
    assert "/api/v1/health/ready" in schema["paths"]


def test_liveness_endpoint_uses_api_version_prefix() -> None:
    with TestClient(build_test_app()) as client:
        unversioned = client.get("/health/live")
        versioned = client.get("/api/v1/health/live")

    assert unversioned.status_code == 404
    assert versioned.status_code == 200
    assert versioned.json() == {
        "status": "ok",
        "service": "PFM Test API",
        "environment": "test",
        "version": __version__,
    }


def test_liveness_endpoint_does_not_require_database() -> None:
    app = build_test_app()

    async def database_not_ready() -> bool:
        return False

    app.dependency_overrides[database_is_ready] = database_not_ready

    with TestClient(app) as client:
        response = client.get("/api/v1/health/live")

    assert response.status_code == 200


def test_http_error_response_uses_error_envelope() -> None:
    app = build_test_app()

    @app.get("/raises-http-error")
    async def raises_http_error() -> None:
        raise HTTPException(status_code=409, detail="Conflict")

    with TestClient(app) as client:
        response = client.get("/raises-http-error")

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "Conflict",
        },
    }


def test_readiness_endpoint_returns_ok_when_database_is_ready() -> None:
    app = build_test_app()

    async def database_ready() -> bool:
        return True

    app.dependency_overrides[database_is_ready] = database_ready

    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ready"}


def test_readiness_endpoint_returns_error_envelope_when_database_is_not_ready() -> None:
    app = build_test_app()

    async def database_not_ready() -> bool:
        return False

    app.dependency_overrides[database_is_ready] = database_not_ready

    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "Database is not ready",
        },
    }


def test_validation_error_response_uses_error_envelope() -> None:
    app = build_test_app()

    @app.get("/items/{item_id}")
    async def read_item(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    with TestClient(app) as client:
        response = client.get("/items/not-an-int")

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Request validation failed"
    assert body["error"]["details"][0]["loc"] == ["path", "item_id"]


def test_unhandled_error_response_uses_error_envelope() -> None:
    app = build_test_app()

    @app.get("/raises-unhandled-error")
    async def raises_unhandled_error() -> None:
        msg = "unexpected failure"
        raise RuntimeError(msg)

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/raises-unhandled-error")

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_server_error",
            "message": "Internal server error",
        },
    }


def test_logging_foundation_configures_app_logger() -> None:
    build_test_app()

    assert logging.getLogger("app").level == logging.INFO
    assert logging.getLogger("authlib").level == logging.WARNING
    assert logging.getLogger("httpcore").level == logging.WARNING
    assert logging.getLogger("httpx").level == logging.WARNING
