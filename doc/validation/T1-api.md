# T1 · S04 统一响应、追踪与存活检查验证

日期：2026-10-23（Asia/Shanghai）。依据：[S04 实施清单](../ENGINEERING_BOOTSTRAP_PLAN.md#s04实现-rest-api-的公共响应能力)、[核心接口契约](../CORE_DATA_API.md#2-公共约定)。

**状态：S04 完成。** 已实现统一响应、公共错误处理、请求追踪、CORS 和存活检查。数据库连接、迁移和 `/health/ready` 属于 S05，整个 T1 尚未完成。

## 执行与范围

- 先在原工作区重新运行 S03 的 25 项测试与 lint，通过后提交为 `b3775f7`（`feat: bootstrap FastAPI application and validated configuration`）。
- S04 在独立工作区、分支 `codex/s04-api-contract` 实施；不启用子代理。只复用已安装的固定版本工具与包缓存，后端虚拟环境按同一 uv.lock 单独创建，没有新增依赖或修改锁文件。
- 本次只执行 S04，后续步骤保持未勾选。测试故障接口仅注册在隔离测试应用中，正式应用只有健康检查和框架文档入口。

## 实现决策

| 文件 | 职责与边界 |
| --- | --- |
| `app/core/response.py` | `ApiResponse[T]`、`success()`；四个顶层字段、对象 data、32 位十六进制 traceId；路由声明的 HTTP 状态与 code 必须一致 |
| `app/core/errors.py` | HTTP/请求校验异常转换；400 损坏 JSON、422 字段路径、安全的 500；保留 HTTP 必要头 |
| `app/core/tracing.py` | ContextVar 请求隔离；服务端生成 UUID hex，忽略客户端追踪头；响应头、响应体和日志同一 ID；结束后重置上下文 |
| `app/health.py` | GET/HEAD `/health/live`；GET 的 data 为 `{"status":"ok"}`；不连接数据库 |
| `app/main.py` | 配置及装配；用户中间件顺序为 Trace → CORS → ErrorBoundary → 框架异常处理/路由 |

- 错误边界放在 CORS 内侧，未处理异常先转换为安全响应，再经过 CORS 和 trace 头处理。当前没有可信上游追踪配置，所有请求独立生成 ID。
- 普通 HTTPException 使用固定的公开提示，不直接回显 detail。422 只返回稳定提示和字段路径，去掉 body/query 等定位前缀，保留数组下标字符串；不序列化 input、ctx 或可能包含输入的 validator 消息。
- 日志包含 traceId、方法、已匹配的路由模板、状态和耗时；错误日志记录异常类型，不记录原始异常消息、堆栈、请求体、凭据或 query。`pnpm dev:backend` 增加 `--no-access-log`，避免 Uvicorn 原始访问日志重复记录私密 URL。
- CORS 使用 Settings 中的明确来源，允许 REST 方法及 Authorization/Content-Type/Idempotency-Key，开放 X-Trace-Id/Location/Retry-After；当前不启用跨域 cookie 凭据。预检沿用 CORS 标准协商响应，不套业务 JSON。
- HEAD、204、205、304 不发送响应体；OpenAPI/HTML、SSE 和下载内容保持原协议。流启动后出错会记录并中断，不再发送第二个响应或夹入 JSON；真正的 AI 流式失败事件由后续模块定义。
- 泛型默认约束先匹配 dict，再匹配 BaseModel，避免当前 Pydantic 将普通字典解析为空 BaseModel。真实测试分别覆盖字典及嵌套模型序列化。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| 先失败、后实现 | 初始 25 项 S04 测试全部失败，原因包括缺路由、框架 detail 响应、无 trace/CORS 和通用响应尚未实现 |
| 全量后端测试 | `python -m pytest services/backend/tests -q -W error`：52 passed，无警告；含 25 项 S03 回归与 27 项 S04 检查 |
| 正常响应 | 200/201/202、Location、四字段、msg、code/HTTP 一致、嵌套模型字段保留 |
| 错误与脱敏 | 400/401/403/404/405/409/422/429/500/503；保留 Allow/WWW-Authenticate/Retry-After；合成敏感输入不出现在错误正文或服务端日志 |
| 追踪隔离 | 忽略伪造 X-Trace-Id；12 个交错请求分别保留自己的 ID，响应/请求日志一致，请求完成后上下文清空 |
| 跨域 | 正常和 500 响应均向允许来源提供 CORS/可读追踪头；预检可用；未允许来源不获得允许头 |
| 协议边界 | 在原始 ASGI 消息层验证 HEAD/204/304 无体；SSE/二进制字节保留；流中断没有第二次 response.start，也无错误 JSON 拼接 |
| 代码检查 | `pnpm lint` 通过：Biome 检查 3 个根配置；Ruff 规则及格式检查通过，13 个文件已格式化 |
| 真实 HTTP | 从临时 cwd 启动实际 Uvicorn factory，使用空闲回环端口 60313；GET/HEAD live、404、405/Allow、OpenAPI、docs、CORS 和预检通过 |
| 真实日志 | live 响应 traceId 为 `10103e09fb8c48f79aefe24fe96edbc5`，同 ID 出现在服务器日志；日志不含合成数据库密码及私密 query |

实际启动使用合成配置和不可连接的数据库地址，证明 live 检查没有偷偷依赖数据库。验证后只停止本次创建的进程组，没有启动 Docker 或改动原型服务。

## 使用与下一步

按根 README 准备固定工具和本地配置后运行 `pnpm dev:backend`，访问 `http://127.0.0.1:8000/health/live`。用 `pnpm test:backend` 和 `pnpm lint` 复现自动检查；业务路由应声明 `ApiResponse[具体模型]`，通过 `success()` 生成成功响应。

下一步为 S05：真实 PostgreSQL、连接生命周期、`/health/ready` 与 Alembic 基线迁移。S04 的 503 测试是异常映射测试，不代表数据库就绪检查已实现。
