import logging
from contextvars import ContextVar
from time import monotonic
from uuid import uuid4

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

_trace_id: ContextVar[str] = ContextVar("trace_id", default="")
request_logger = logging.getLogger("life_canvas.requests")


def get_trace_id() -> str:
    return _trace_id.get()


def configure_request_logging() -> None:
    # Keep framework access logs disabled: URLs may contain private query values.
    if not request_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
        request_logger.addHandler(handler)
    request_logger.setLevel(logging.INFO)


class TraceMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # No trusted upstream is configured yet; client-supplied IDs are ignored.
        trace_id = uuid4().hex
        token = _trace_id.set(trace_id)
        started = monotonic()
        status = 0

        async def traced_send(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = MutableHeaders(scope=message)
                headers["X-Trace-Id"] = trace_id
                if status == 204:
                    del headers["content-length"]
                elif status == 205:
                    headers["content-length"] = "0"
            elif message["type"] == "http.response.body" and (
                scope["method"] == "HEAD" or status in {204, 205, 304}
            ):
                message = {**message, "body": b""}
            await send(message)

        try:
            await self.app(scope, receive, traced_send)
        finally:
            try:
                # Route templates exclude user identifiers, query strings and unknown paths.
                route = getattr(scope.get("route"), "path", "-")
                request_logger.info(
                    "request.completed traceId=%s method=%s route=%s status=%s durationMs=%.2f",
                    trace_id,
                    scope["method"],
                    route,
                    status,
                    (monotonic() - started) * 1000,
                    extra={"traceId": trace_id},
                )
            finally:
                _trace_id.reset(token)
