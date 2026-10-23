from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.response import ApiResponse, success
from app.core.tracing import get_trace_id

router = APIRouter(tags=["health"])


class HealthRead(BaseModel):
    status: Literal["ok"]


@router.get("/health/live", response_model=ApiResponse[HealthRead])
async def liveness() -> ApiResponse[HealthRead]:
    return success(HealthRead(status="ok"), trace_id=get_trace_id())


router.add_api_route("/health/live", liveness, methods=["HEAD"], include_in_schema=False)
