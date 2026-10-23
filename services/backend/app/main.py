from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import Settings, load_settings
from app.core.db import create_engine, dispose_engine
from app.core.errors import ErrorBoundaryMiddleware, register_error_handlers
from app.core.tracing import TraceMiddleware, configure_request_logging
from app.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine(app.state.settings)
    app.state.db_engine = engine
    try:
        yield
    finally:
        await dispose_engine(engine)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Validate configuration before serving requests; allow explicit test injection."""
    resolved_settings = settings if settings is not None else load_settings()
    app = FastAPI(title="Life Canvas API", version="0.0.0", lifespan=lifespan)
    app.state.settings = resolved_settings
    configure_request_logging()
    register_error_handlers(app)
    app.include_router(health_router)
    # Last added is outermost: trace -> CORS -> safe errors -> routes.
    app.add_middleware(ErrorBoundaryMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origins,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Trace-Id", "Location", "Retry-After"],
    )
    app.add_middleware(TraceMiddleware)
    return app
