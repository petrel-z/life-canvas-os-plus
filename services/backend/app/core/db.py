import asyncio

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import Settings
from app.core.tracing import get_trace_id, request_logger

# Timed-out probes still need to release their driver connections. Keep them alive
# per engine until cleanup finishes, and drain them before lifespan disposes the pool.
_probes: dict[AsyncEngine, set[asyncio.Task[bool]]] = {}


def create_engine(settings: Settings) -> AsyncEngine:
    """Create a lazy pool; an offline database must not prevent process startup."""
    return create_async_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=2,
        connect_args={"connect_timeout": 2},
        hide_parameters=True,
    )


async def _select_one(engine: AsyncEngine) -> bool:
    try:
        async with engine.connect() as connection:
            return await connection.scalar(text("SELECT 1")) == 1
    except (TimeoutError, SQLAlchemyError, OSError):
        # Never return/log driver exception text: it may contain credentials or SQL inputs.
        return False


def _finish_probe(engine: AsyncEngine, task: asyncio.Task[bool]) -> None:
    pending = _probes[engine]
    pending.discard(task)
    if not pending:
        del _probes[engine]
    if not task.cancelled() and (error := task.exception()) is not None:
        request_logger.error(
            "database.probe_failed traceId=%s errorType=%s", get_trace_id(), type(error).__name__
        )


async def probe_database(engine: AsyncEngine) -> bool:
    """Bound the response deadline even when the driver's cancellation handshake stalls."""
    task = asyncio.create_task(_select_one(engine), name="database-readiness")
    _probes.setdefault(engine, set()).add(task)
    task.add_done_callback(lambda completed: _finish_probe(engine, completed))
    try:
        done, _ = await asyncio.wait({task}, timeout=2)
        return task.result() if done else False
    finally:
        if not task.done():
            # wait_for/timeout would await cancellation and can exceed the deadline.
            task.cancel()


async def dispose_engine(engine: AsyncEngine) -> None:
    pending = tuple(_probes.get(engine, ()))
    try:
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
    finally:
        await engine.dispose()
