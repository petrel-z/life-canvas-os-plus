import asyncio
import logging
import re
from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI, HTTPException, Response
from httpx import ASGITransport, AsyncClient
from httpx import Response as HttpResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.responses import StreamingResponse
from starlette.types import Message

from app.core.config import Settings
from app.main import create_app

SECRET = "s04-synthetic-private-input"
ORIGIN = "http://localhost:5173"


class Item(BaseModel):
    quantity: int = Field(gt=0)

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_quantity(cls, value: object) -> object:
        if value == SECRET:
            raise ValueError(f"private validator input: {value}")
        return value


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[Item]


@pytest.fixture
def api_app() -> FastAPI:
    app = create_app(
        Settings(database_url="postgresql://test:fake@localhost/missing", cors_origins=(ORIGIN,))
    )

    @app.post("/test/validate")
    async def validate(payload: Payload) -> dict[str, bool]:
        return {"ok": True}

    @app.get("/test/crash")
    async def crash() -> None:
        raise RuntimeError(SECRET)

    @app.get("/test/http/{status}")
    async def http_error(status: int) -> None:
        raise HTTPException(
            status_code=status,
            detail=SECRET,
            headers={"WWW-Authenticate": "Bearer", "Retry-After": "30"},
        )

    return app


@pytest.fixture
async def client(api_app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(api_app, raise_app_exceptions=False), base_url="http://test"
    ) as session:
        yield session


def assert_envelope(response: HttpResponse, status: int) -> dict:
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"code", "msg", "data", "traceId"}
    assert type(body["code"]) is int and body["code"] == status
    assert isinstance(body["msg"], str) and body["msg"]
    assert isinstance(body["data"], dict)
    assert re.fullmatch(r"[0-9a-f]{32}", body["traceId"])
    assert body["traceId"] == response.headers["X-Trace-Id"]
    assert SECRET not in response.text
    return body


@pytest.mark.anyio
@pytest.mark.parametrize("status", [200, 201, 202])
async def test_success_status_and_location(api_app: FastAPI, client: AsyncClient, status: int):
    @api_app.post("/test/success", status_code=status)
    async def endpoint(response: Response):
        from app.core.response import success
        from app.core.tracing import get_trace_id

        response.headers["Location"] = "/api/v1/test-resources/123"
        return success({"id": "123"}, trace_id=get_trace_id(), status_code=status)

    response = await client.post("/test/success")
    body = assert_envelope(response, status)
    assert body["msg"] == "success" and body["data"] == {"id": "123"}
    assert response.headers["Location"] == "/api/v1/test-resources/123"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("status", "reason"),
    [
        (400, "BAD_REQUEST"),
        (401, "UNAUTHORIZED"),
        (403, "FORBIDDEN"),
        (404, "NOT_FOUND"),
        (409, "CONFLICT"),
        (429, "RATE_LIMITED"),
        (503, "SERVICE_UNAVAILABLE"),
    ],
)
async def test_http_errors_are_safe_and_keep_headers(client: AsyncClient, status: int, reason: str):
    response = await client.get(f"/test/http/{status}")
    body = assert_envelope(response, status)
    assert body["data"]["reason"] == reason
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.headers["Retry-After"] == "30"


@pytest.mark.anyio
async def test_unknown_route_and_method_use_envelope(client: AsyncClient):
    assert_envelope(await client.get("/not-found"), 404)
    response = await client.delete("/test/validate")
    assert_envelope(response, 405)
    assert "POST" in response.headers["Allow"]


@pytest.mark.anyio
async def test_broken_json_is_400_and_field_validation_is_422(client: AsyncClient):
    broken = await client.post(
        "/test/validate", content='{"items":', headers={"Content-Type": "application/json"}
    )
    assert assert_envelope(broken, 400)["data"]["reason"] == "INVALID_JSON"
    invalid = await client.post("/test/validate", json={"items": [{"quantity": SECRET}]})
    data = assert_envelope(invalid, 422)["data"]
    assert data["reason"] == "VALIDATION_ERROR"
    assert data["errors"][0]["path"] == ["items", "0", "quantity"]
    assert set(data["errors"][0]) == {"path", "msg"}
    assert data["errors"][0]["msg"]


@pytest.mark.anyio
async def test_unhandled_error_is_logged_without_private_exception(client: AsyncClient, caplog):
    with caplog.at_level(logging.INFO, logger="life_canvas.requests"):
        response = await client.get(f"/test/crash?token={SECRET}")
    body = assert_envelope(response, 500)
    assert body["data"]["reason"] == "INTERNAL_ERROR"
    assert SECRET not in caplog.text
    records = [r for r in caplog.records if getattr(r, "traceId", None) == body["traceId"]]
    assert any(r.levelno >= logging.ERROR for r in records)
    assert all(r.exc_info is None for r in records)


@pytest.mark.anyio
async def test_client_cannot_choose_trace_id(client: AsyncClient):
    first = await client.get("/health/live", headers={"X-Trace-Id": "a" * 32})
    second = await client.get("/health/live", headers={"X-Trace-Id": "a" * 32})
    first_id = assert_envelope(first, 200)["traceId"]
    second_id = assert_envelope(second, 200)["traceId"]
    assert len({first_id, second_id, "a" * 32}) == 3


@pytest.mark.anyio
async def test_parallel_requests_keep_trace_context_and_reset_it(api_app: FastAPI, client, caplog):
    @api_app.get("/test/concurrent/{number}")
    async def concurrent(number: int):
        from app.core.response import success
        from app.core.tracing import get_trace_id

        before = get_trace_id()
        await asyncio.sleep(0)
        return success({"before": before, "after": get_trace_id()}, trace_id=get_trace_id())

    with caplog.at_level(logging.INFO, logger="life_canvas.requests"):
        responses = await asyncio.gather(*(client.get(f"/test/concurrent/{n}") for n in range(12)))
    ids = set()
    for response in responses:
        body = assert_envelope(response, 200)
        assert body["data"]["before"] == body["data"]["after"] == body["traceId"]
        assert any(getattr(r, "traceId", None) == body["traceId"] for r in caplog.records)
        ids.add(body["traceId"])
    assert len(ids) == 12
    from app.core.tracing import get_trace_id

    assert get_trace_id() == ""


@pytest.mark.anyio
@pytest.mark.parametrize(("path", "status"), [("/health/live", 200), ("/test/crash", 500)])
async def test_cors_covers_success_and_internal_errors(client, path, status):
    response = await client.get(path, headers={"Origin": ORIGIN})
    assert_envelope(response, status)
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    exposed = response.headers["Access-Control-Expose-Headers"].lower()
    assert "x-trace-id" in exposed and "location" in exposed


@pytest.mark.anyio
async def test_cors_preflight_and_denied_origins(client):
    response = await client.options(
        "/test/validate",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["X-Trace-Id"])
    denied = await client.get("/health/live", headers={"Origin": "https://untrusted.example"})
    assert "Access-Control-Allow-Origin" not in denied.headers


@pytest.mark.anyio
@pytest.mark.parametrize(("method", "status"), [("GET", 204), ("GET", 304), ("HEAD", 200)])
async def test_bodyless_protocol_at_asgi_boundary(api_app, method, status):
    @api_app.api_route("/test/bodyless", methods=[method])
    async def bodyless():
        return Response(content=b"must-not-be-sent", status_code=status)

    messages: list[Message] = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    await api_app(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": "/test/bodyless",
            "raw_path": b"/test/bodyless",
            "root_path": "",
            "query_string": b"",
            "headers": [],
            "server": ("test", 80),
            "client": ("test", 1234),
        },
        receive,
        send,
    )
    assert messages[0]["status"] == status
    assert b"x-trace-id" in dict(messages[0]["headers"])
    assert b"".join(m.get("body", b"") for m in messages[1:]) == b""


@pytest.mark.anyio
@pytest.mark.parametrize("media_type", ["text/event-stream", "application/octet-stream"])
async def test_streams_and_downloads_are_not_json_wrapped(api_app, client, media_type):
    data = b"data: sample\n\n" if media_type == "text/event-stream" else b"\x00\x01\xff"

    @api_app.get("/test/stream")
    async def stream():
        async def chunks():
            yield data

        return StreamingResponse(chunks(), media_type=media_type)

    response = await client.get("/test/stream")
    assert response.content == data
    assert response.headers["content-type"].startswith(media_type)
    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["X-Trace-Id"])


@pytest.mark.anyio
async def test_success_preserves_nested_model_fields(api_app, client):
    @api_app.get("/test/model")
    async def model():
        from app.core.response import success
        from app.core.tracing import get_trace_id

        return success(Payload(items=[Item(quantity=3)]), trace_id=get_trace_id())

    body = assert_envelope(await client.get("/test/model"), 200)
    assert body["data"] == {"items": [{"quantity": 3}]}


@pytest.mark.anyio
async def test_started_stream_error_does_not_send_second_response(api_app, caplog):
    @api_app.get("/test/broken-stream")
    async def broken_stream():
        async def chunks():
            yield b"data: started\n\n"
            raise RuntimeError(SECRET)

        return StreamingResponse(chunks(), media_type="text/event-stream")

    messages: list[Message] = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/test/broken-stream",
        "raw_path": b"/test/broken-stream",
        "root_path": "",
        "query_string": b"",
        "headers": [],
        "server": ("test", 80),
        "client": ("test", 1234),
    }
    with caplog.at_level(logging.INFO, logger="life_canvas.requests"):
        with pytest.raises(RuntimeError) as caught:
            await api_app(scope, receive, send)
    import traceback

    assert SECRET not in "".join(traceback.format_exception(caught.value))
    assert SECRET not in caplog.text
    assert sum(m["type"] == "http.response.start" for m in messages) == 1
    assert b"".join(m.get("body", b"") for m in messages) == b"data: started\n\n"
    trace = dict(messages[0]["headers"])[b"x-trace-id"].decode()
    assert trace in str(caught.value)
