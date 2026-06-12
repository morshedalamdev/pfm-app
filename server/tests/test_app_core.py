import logging

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app import __version__
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


def test_openapi_metadata_and_versioned_route() -> None:
    with TestClient(build_test_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "PFM Test API"
    assert schema["info"]["version"] == __version__
    assert "/api/v1/health/live" in schema["paths"]


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
