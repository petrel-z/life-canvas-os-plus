import re

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@pytest.mark.anyio
async def test_liveness_uses_api_contract_without_contacting_database() -> None:
    app = create_app(Settings(database_url="postgresql://test:fake@127.0.0.1:1/missing"))
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
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
        unimplemented = await client.get("/health/ready")
    schema = schema_response.json()
    assert "openapi" in schema and "traceId" not in schema
    response_schema = schema["paths"]["/health/live"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    model = schema["components"]["schemas"][response_schema["$ref"].split("/")[-1]]
    assert set(model["required"]) == {"code", "msg", "data", "traceId"}
    assert docs.status_code == 200 and docs.headers["content-type"].startswith("text/html")
    assert unimplemented.status_code == 404
