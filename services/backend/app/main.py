from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import Settings, load_settings
from app.core.errors import ErrorBoundaryMiddleware, register_error_handlers
from app.core.tracing import TraceMiddleware, configure_request_logging
from app.health import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Validate configuration before serving requests; allow explicit test injection."""
    resolved_settings = settings if settings is not None else load_settings()
    app = FastAPI(title="Life Canvas API", version="0.0.0")
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
