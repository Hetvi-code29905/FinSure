# app/core/exceptions.py
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Domain exceptions ─────────────────────────────────────────
class AppException(Exception):
    def __init__(self, message: str, code: str = "error", status_code: int = 400):
        self.message     = message
        self.code        = code
        self.status_code = status_code
        super().__init__(message)

class AuthException(AppException):
    def __init__(self, message: str = "Authentication failed.", code: str = "auth_error"):
        super().__init__(message, code, 401)

class PermissionException(AppException):
    def __init__(self, message: str = "Permission denied.", code: str = "forbidden"):
        super().__init__(message, code, 403)

class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found.", "not_found", 404)

class ConflictException(AppException):
    def __init__(self, message: str, code: str = "conflict"):
        super().__init__(message, code, 409)

class ValidationException(AppException):
    def __init__(self, message: str, code: str = "validation_error"):
        super().__init__(message, code, 422)

class PlaidException(AppException):
    def __init__(self, message: str, code: str = "plaid_error"):
        super().__init__(message, code, 502)

class MLException(AppException):
    def __init__(self, message: str, code: str = "ml_error"):
        super().__init__(message, code, 500)


# ── Register handlers ─────────────────────────────────────────
def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppException)
    async def app_exc_handler(request: Request, exc: AppException):
        logger.warning("AppException", extra={"code": exc.code, "path": str(request.url)})
        return JSONResponse(status_code=exc.status_code,
                            content={"detail": exc.message, "code": exc.code})

    @app.exception_handler(StarletteHTTPException)
    async def http_exc_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code,
                            content={"detail": exc.detail, "code": "http_error"})

    @app.exception_handler(RequestValidationError)
    async def validation_exc_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation failed.", "code": "validation_error",
                     "errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exc_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", extra={"error": str(exc), "path": str(request.url)},
                     exc_info=exc)
        return JSONResponse(status_code=500,
                            content={"detail": "Internal server error.", "code": "internal_error"})