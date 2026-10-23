from collections.abc import Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.response import ApiResponse
from app.core.tracing import get_trace_id, request_logger

HTTP_ERRORS: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "请求格式不正确"),
    401: ("UNAUTHORIZED", "请登录后重试"),
    403: ("FORBIDDEN", "没有执行此操作的权限"),
    404: ("NOT_FOUND", "请求的资源不存在"),
    405: ("METHOD_NOT_ALLOWED", "不支持此请求方法"),
    409: ("CONFLICT", "数据状态冲突，请刷新后重试"),
    422: ("VALIDATION_ERROR", "请求参数校验失败"),
    429: ("RATE_LIMITED", "请求过于频繁，请稍后重试"),
    500: ("INTERNAL_ERROR", "服务发生错误，请稍后重试"),
    503: ("SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后重试"),
}


class FieldError(BaseModel):
    path: list[str]
    msg: str


class ErrorData(BaseModel):
    reason: str
    errors: list[FieldError] | None = None


def error_response(
    status: int,
    *,
    reason: str | None = None,
    msg: str | None = None,
    errors: list[FieldError] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    default_reason, default_msg = HTTP_ERRORS.get(status, ("HTTP_ERROR", "请求未能完成"))
    body = ApiResponse[ErrorData](
        code=status,
        msg=msg or default_msg,
        data=ErrorData(reason=reason or default_reason, errors=errors),
        traceId=get_trace_id(),
    )
    return JSONResponse(
        body.model_dump(mode="json", exclude_none=True), status_code=status, headers=headers
    )


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Framework exception details can contain raw input; use stable public messages.
    headers = dict(exc.headers or {})
    if exc.status_code == 401 and not any(key.lower() == "www-authenticate" for key in headers):
        headers["WWW-Authenticate"] = "Bearer"
    return error_response(exc.status_code, headers=headers)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    issues = exc.errors()
    if any(issue["type"] == "json_invalid" for issue in issues):
        return error_response(400, reason="INVALID_JSON", msg="请求 JSON 格式不正确")
    fields = []
    for issue in issues:
        location = list(issue.get("loc", ()))
        if location and location[0] in {"body", "query", "path", "header", "cookie"}:
            location = location[1:]
        # Neither input, ctx nor validator messages are safe to echo to logs or clients.
        message = {"missing": "此字段必填", "extra_forbidden": "不支持此字段"}.get(
            issue["type"], "字段值不合法"
        )
        fields.append(FieldError(path=[str(part) for part in location], msg=message))
    return error_response(422, errors=fields)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)


class ErrorBoundaryMiddleware:
    """Resolve unhandled errors inside CORS and tracing; never log private exception text."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        response_started = False

        async def track_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, track_start)
        except Exception as exc:
            trace_id = get_trace_id()
            request_logger.error(
                "request.failed traceId=%s errorType=%s",
                trace_id,
                type(exc).__name__,
                extra={"traceId": trace_id},
            )
            if response_started:
                # A started stream cannot become a second HTTP/JSON response.
                raise RuntimeError(f"response interrupted; traceId={trace_id}") from None
            await error_response(500)(scope, receive, send)
