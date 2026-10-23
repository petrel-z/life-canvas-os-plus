from fastapi import FastAPI

from app.core.config import Settings, load_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Validate configuration before serving requests; allow explicit test injection."""
    resolved_settings = settings if settings is not None else load_settings()
    app = FastAPI(title="Life Canvas API", version="0.0.0")
    app.state.settings = resolved_settings
    return app
