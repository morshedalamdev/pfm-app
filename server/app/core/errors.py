from collections.abc import Awaitable, Callable, Sequence
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse, Response

ExceptionHandler = Callable[[Request, Exception], Response | Awaitable[Response]]
SENSITIVE_VALIDATION_FIELDS = frozenset(
    {
        "password",
        "password_hash",
        "token",
        "access_token",
        "refresh_token",
        "registration_ticket",
        "exchange_code",
    }
)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


def build_error_payload(
    code: str,
    message: str,
    details: Any | None = None,
) -> dict[str, Any]:
    envelope = ErrorEnvelope(
        error=ErrorDetail(code=code, message=message, details=details),
    )
    return envelope.model_dump(exclude_none=True)


def sanitize_validation_errors(errors: Sequence[Any]) -> list[dict[str, Any]]:
    sanitized_errors: list[dict[str, Any]] = []

    for error in errors:
        sanitized_error = dict(error)
        loc = sanitized_error.get("loc", ())
        loc_parts = {str(part).lower() for part in loc}
        if loc_parts & SENSITIVE_VALIDATION_FIELDS and "input" in sanitized_error:
            sanitized_error["input"] = "[redacted]"
        sanitized_errors.append(sanitized_error)

    return sanitized_errors


async def http_exception_handler(
    _request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    code = "not_found" if exc.status_code == 404 else "http_error"
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_payload(code=code, message=message),
        headers=exc.headers,
    )


async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=build_error_payload(
            code="validation_error",
            message="Request validation failed",
            details=jsonable_encoder(sanitize_validation_errors(exc.errors())),
        ),
    )


async def unhandled_exception_handler(
    _request: Request,
    _exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=build_error_payload(
            code="internal_server_error",
            message="Internal server error",
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        StarletteHTTPException,
        cast(ExceptionHandler, http_exception_handler),
    )
    app.add_exception_handler(
        RequestValidationError,
        cast(ExceptionHandler, validation_exception_handler),
    )
    app.add_exception_handler(Exception, unhandled_exception_handler)
