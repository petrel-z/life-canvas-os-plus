import asyncio
import os
import subprocess
import sys
from pathlib import Path
from time import monotonic

import psycopg
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.main import create_app

BACKEND_DIR = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.integration


@pytest.mark.anyio
async def test_database_pool_probes_real_postgres_and_closes_on_shutdown(database_url: str) -> None:
    app = create_app(Settings(database_url=database_url))
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
            response = await client.get("/health/ready")
        assert response.status_code == 200
        assert response.json()["data"] == {"status": "ok"}
        assert response.json()["code"] == 200
        assert response.headers["X-Trace-Id"] == response.json()["traceId"]
        async with app.state.db_engine.connect() as connection:
            assert (
                await connection.scalar(text("SELECT current_database()"))
                == make_url(database_url).database
            )
            raw = await connection.get_raw_connection()
            driver = raw.driver_connection
        assert not driver.closed
    assert driver.closed


@pytest.mark.anyio
async def test_pool_recovers_after_postgres_terminates_idle_connections(database_url: str) -> None:
    app = create_app(Settings(database_url=database_url))
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
    ):
        assert (await client.get("/health/ready")).status_code == 200
        admin = await psycopg.AsyncConnection.connect(
            database_url.replace("postgresql+psycopg:", "postgresql:"), autocommit=True
        )
        async with admin:
            await admin.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = current_database() AND pid <> pg_backend_pid()"
            )
        assert (await client.get("/health/ready")).status_code == 200


@pytest.mark.anyio
async def test_pool_wait_is_bounded_and_cancellation_is_preserved(database_url: str) -> None:
    from app.core.db import create_engine, probe_database

    engine = create_engine(Settings(database_url=database_url))
    held = []
    try:
        # Occupy the finite pool and overflow: the probe must time out while waiting.
        pool = engine.pool
        for _ in range(pool.size() + pool._max_overflow):
            held.append(await engine.connect())
        assert await asyncio.wait_for(probe_database(engine), timeout=2.5) is False
        pending = asyncio.create_task(probe_database(engine))
        await asyncio.sleep(0.05)
        pending.cancel()
        with pytest.raises(asyncio.CancelledError):
            await pending
        await held.pop().close()
        assert await probe_database(engine) is True
    finally:
        for connection in held:
            await connection.close()
        await engine.dispose()


@pytest.mark.anyio
async def test_readiness_deadline_includes_stalled_existing_connection(database_url: str) -> None:
    # A real PostgreSQL proxy that stops forwarding after a successful probe.
    # This also stalls psycopg's cancellation handshake, not just the SELECT.
    upstream = make_url(database_url)
    forward = asyncio.Event()
    forward.set()
    handlers: set[asyncio.Task] = set()

    async def relay(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        while data := await reader.read(65536):
            await forward.wait()
            writer.write(data)
            await writer.drain()

    async def accept(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        task = asyncio.current_task()
        handlers.add(task)
        remote = None
        relays = []
        try:
            incoming, remote = await asyncio.open_connection(upstream.host, upstream.port or 5432)
            relays = [
                asyncio.create_task(relay(reader, remote)),
                asyncio.create_task(relay(incoming, writer)),
            ]
            await asyncio.wait(relays, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for relay_task in relays:
                relay_task.cancel()
            await asyncio.gather(*relays, return_exceptions=True)
            for stream in (writer, remote):
                if stream is not None:
                    stream.close()
                    await stream.wait_closed()
            handlers.discard(task)

    server = await asyncio.start_server(accept, "127.0.0.1", 0)
    proxy_url = upstream.set(host="127.0.0.1", port=server.sockets[0].getsockname()[1])
    app = create_app(Settings(database_url=proxy_url.render_as_string(hide_password=False)))
    pending = None
    try:
        async with (
            app.router.lifespan_context(app),
            AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
        ):
            assert (await client.get("/health/ready")).status_code == 200
            forward.clear()
            started = monotonic()
            pending = asyncio.create_task(client.get("/health/ready"))
            try:
                await asyncio.sleep(2.3)
                assert pending.done(), "driver cancellation must not extend the readiness deadline"
                response = pending.result()
                assert response.status_code == 503
                assert monotonic() - started < 2.5
            finally:
                forward.set()
                await asyncio.wait_for(pending, timeout=15)
    finally:
        forward.set()
        server.close()
        for handler in list(handlers):
            handler.cancel()
        await asyncio.gather(*handlers, return_exceptions=True)
        await server.wait_closed()


def run_alembic(
    database_url: str, *arguments: str, cwd: Path = BACKEND_DIR
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["MIGRATION_DATABASE_URL"] = database_url
    # Using runtime credentials instead of migration credentials must make this test fail.
    env["DATABASE_URL"] = "postgresql://wrong:fake@127.0.0.1:1/wrong"
    return subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(BACKEND_DIR / "alembic.ini"), *arguments],
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        timeout=15,
    )


def test_baseline_upgrade_downgrade_and_reupgrade_preserve_existing_data(
    database_url: str, tmp_path: Path
) -> None:
    plain_url = database_url.replace("postgresql+psycopg:", "postgresql:")
    with psycopg.connect(plain_url, autocommit=True) as connection:
        result = run_alembic(database_url, "upgrade", "head", cwd=tmp_path)
        assert result.returncode == 0, result.stderr
        assert connection.execute("SELECT version_num FROM alembic_version").fetchall() == [
            ("0000_baseline",)
        ]
        assert connection.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        ).fetchall() == [("alembic_version",)]
        connection.execute("CREATE TABLE preserved_data (value text NOT NULL)")
        connection.execute("INSERT INTO preserved_data VALUES ('keep me')")
        current = run_alembic(database_url, "current")
        assert current.returncode == 0 and "0000_baseline (head)" in current.stdout
        assert run_alembic(database_url, "downgrade", "base").returncode == 0
        assert connection.execute("SELECT version_num FROM alembic_version").fetchall() == []
        assert run_alembic(database_url, "upgrade", "head").returncode == 0
        assert connection.execute("SELECT value FROM preserved_data").fetchall() == [("keep me",)]


def test_migration_failure_does_not_echo_credentials(tmp_path: Path) -> None:
    secret = "s05-migration-private"
    result = run_alembic(
        f"postgresql://test:{secret}@127.0.0.1:1/unavailable", "upgrade", "head", cwd=tmp_path
    )
    assert result.returncode != 0
    assert secret not in result.stdout + result.stderr
    assert "数据库迁移失败" in result.stdout + result.stderr
