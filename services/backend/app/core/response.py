from pydantic import BaseModel, ConfigDict, Field


# Keep dict first: an unparameterized BaseModel bound can consume dicts as empty models.
class ApiResponse[T: dict[str, object] | BaseModel](BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: int = Field(strict=True, ge=200, le=599)
    msg: str
    data: T
    traceId: str = Field(pattern=r"^[0-9a-f]{32}$")


def success[T: dict[str, object] | BaseModel](
    data: T, *, trace_id: str, status_code: int = 200
) -> ApiResponse[T]:
    """The route must declare the same HTTP status as this response's code."""
    if not 200 <= status_code < 300 or status_code in {204, 205}:
        raise ValueError("a JSON success response requires a body-bearing 2xx status")
    return ApiResponse(code=status_code, msg="success", data=data, traceId=trace_id)
