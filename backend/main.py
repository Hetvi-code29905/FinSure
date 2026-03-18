# main.py
"""
Finomous — FastAPI entry point.

Startup:  logging → MongoDB → APScheduler → rate limiter → API router
Shutdown: scheduler → MongoDB connection closed

Run:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000          # dev
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2       # prod
"""
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.api.v1.api import api_router
from app.background.worker import start_scheduler, stop_scheduler
from app.utils.rate_limit import limiter

# ── Logging first ─────────────────────────────────────────────
setup_logging(level=settings.LOG_LEVEL, fmt=settings.LOG_FORMAT)
logger = get_logger(__name__)


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} "
        f"[{settings.ENVIRONMENT}]"
    )
    await init_db()
    await start_scheduler()
    logger.info("Ready — http://localhost:8000/docs")
    yield
    logger.info("Shutting down...")
    await stop_scheduler()
    await close_db()
    logger.info("Shutdown complete.")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Financial Stability & Risk Intelligence Platform",
    docs_url="/docs"  if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# Request ID middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id   = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response

# Exception handlers
register_exception_handlers(app)

# API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ── Root ──────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status":  "ok",
        "docs":    "/docs" if settings.DEBUG else "disabled",
    }


if __name__ == "__main__":
    import uvicorn
    
    # This matches the host and port you mentioned in your comments
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,  # Set to False if you are in production
        log_level="info"
    )