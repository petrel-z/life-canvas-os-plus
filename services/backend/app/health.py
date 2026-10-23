from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from app.core.db import probe_database
from app.core.errors import ErrorData, error_response
from app.core.response import ApiResponse, success
from app.core.tracing import get_trace_id

router = APIRouter(tags=["health"])


class HealthRead(BaseModel):
    status: Literal["ok"]


@router.get("/health/live", response_model=ApiResponse[HealthRead])
async def liveness() -> ApiResponse[HealthRead]:
    return success(HealthRead(status="ok"), trace_id=get_trace_id())


router.add_api_route("/health/live", liveness, methods=["HEAD"], include_in_schema=False)


@router.get(
    "/health/ready",
    response_model=ApiResponse[HealthRead],
    responses={503: {"model": ApiResponse[ErrorData], "description": "数据库暂时不可用"}},
)
async def readiness(request: Request) -> ApiResponse[HealthRead] | Response:
    if not await probe_database(request.app.state.db_engine):
        return error_response(503, reason="DATABASE_UNAVAILABLE")
    return success(HealthRead(status="ok"), trace_id=get_trace_id())


router.add_api_route(
    "/health/ready", readiness, methods=["HEAD"], include_in_schema=False, response_model=None
)
