import asyncio
import re
import socket
from time import monotonic

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@pytest.mark.anyio
async def test_liveness_uses_api_contract_without_contacting_database() -> None:
    app = create_app(Settings(database_url="postgresql://test:fake@127.0.0.1:1/missing"))
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
    ):
        response = await client.get("/health/live")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"code", "msg", "data", "traceId"}
    assert body["code"] == 200
    assert body["msg"] == "success"
    assert body["data"] == {"status": "ok"}
    assert re.fullmatch(r"[0-9a-f]{32}", body["traceId"])
    assert response.headers["X-Trace-Id"] == body["traceId"]


@pytest.mark.anyio
async def test_openapi_documents_liveness_and_keeps_standard_schema() -> None:
    app = create_app(Settings(database_url="postgresql://test:fake@localhost/missing"))
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
        schema_response = await client.get("/openapi.json")
        docs = await client.get("/docs")
    schema = schema_response.json()
    assert "openapi" in schema and "traceId" not in schema
    response_schema = schema["paths"]["/health/live"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    model = schema["components"]["schemas"][response_schema["$ref"].split("/")[-1]]
    assert set(model["required"]) == {"code", "msg", "data", "traceId"}
    assert docs.status_code == 200 and docs.headers["content-type"].startswith("text/html")
    ready_responses = schema["paths"]["/health/ready"]["get"]["responses"]
    assert {"200", "503"} <= ready_responses.keys()
    assert ready_responses["503"]["content"]["application/json"]["schema"]["$ref"]


@pytest.mark.anyio
async def test_unreachable_database_is_not_ready_but_process_stays_live(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with socket.socket() as unused:
        unused.bind(("127.0.0.1", 0))
        port = unused.getsockname()[1]
        app = create_app(
            Settings(
                database_url=f"postgresql://test:health-private@127.0.0.1:{port}/missing",
                cors_origins=("http://localhost:5173",),
            )
        )
        async with (
            app.router.lifespan_context(app),
            AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
        ):
            response = await client.get(
                "/health/ready", headers={"Origin": "http://localhost:5173"}
            )
            live = await client.get("/health/live")
            head = await client.head("/health/ready")
    assert live.status_code == 200
    assert response.status_code == head.status_code == 503
    assert head.content == b""
    assert response.json()["code"] == 503
    assert response.json()["data"] == {"reason": "DATABASE_UNAVAILABLE"}
    assert response.json()["traceId"] == response.headers["X-Trace-Id"]
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "health-private" not in response.text + caplog.text


@pytest.mark.anyio
async def test_stalled_database_times_out_without_blocking_liveness() -> None:
    # Accept TCP but never speak PostgreSQL: exercises the real async connect timeout.
    writers: list[asyncio.StreamWriter] = []

    def accept(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        writers.append(writer)

    server = await asyncio.start_server(accept, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    app = create_app(Settings(database_url=f"postgresql://test:fake@127.0.0.1:{port}/stalled"))
    try:
        async with (
            app.router.lifespan_context(app),
            AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
        ):
            started = monotonic()
            ready = asyncio.create_task(client.get("/health/ready"))
            await asyncio.sleep(0.1)
            live = await asyncio.wait_for(client.get("/health/live"), timeout=0.5)
            assert live.status_code == 200 and not ready.done()
            response = await asyncio.wait_for(ready, timeout=2.5)
            assert response.status_code == 503
            assert response.json()["data"]["reason"] == "DATABASE_UNAVAILABLE"
            # Allow scheduling jitter around the 2-second application deadline.
            assert monotonic() - started < 2.5
    finally:
        server.close()
        for writer in writers:
            writer.close()
            await writer.wait_closed()
        await server.wait_closed()
