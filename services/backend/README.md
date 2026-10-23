# Life Canvas 后端

S03 提供 FastAPI 应用工厂、环境配置与校验；S04 已接入统一响应、异常处理、请求追踪、CORS 和存活检查。PostgreSQL 连接与迁移在 S05 接入，业务接口按后续任务实施。

## 安装

使用 Python **3.12.15**、uv **0.13.5**，从仓库根目录执行：

```sh
uv sync --project services/backend --frozen --python 3.12.15
```

依赖按 `uv.lock` 安装，虚拟环境位于 `services/backend/.venv/`。本机项目工具的 PATH 与缓存设置见[根 README](../../README.md)。克隆仓库后需要自行准备固定版本的 uv；uv 可下载缺失的 Python，不依赖系统默认解释器。

## 配置与启动

将[根环境示例](../../.env.example)复制到仓库根目录 `.env`，填入本机值；已有 `.env` 时只补充缺失项。该文件由 Git 忽略，不能提交真实凭据。

| 变量 | 规则 |
| --- | --- |
| `APP_ENV` | `development`（默认）、`test` 或 `production` |
| `DATABASE_URL` | 必填 PostgreSQL 连接串，须包含主机与数据库名；支持 `postgresql://` 和 `postgresql+psycopg://`，统一使用 psycopg 3 |
| `CORS_ORIGINS` | JSON 数组，如 `["http://localhost:5173"]`；默认空列表，仅接受不带认证、路径、查询或片段的 HTTP(S) origin |

根 `.env` 的位置由源码定位，不随启动工作目录改变。优先级为：显式注入 `Settings` 字段 → 进程环境变量 → 根 `.env` → 字段默认值。读取配置不缓存，缺少必需项或格式错误会阻止启动；不回退到演示配置。当前阶段不要求 Auth、模型或 Worker 凭据。

```sh
pnpm dev:backend
```

等价命令：

```sh
uv run --frozen --project services/backend uvicorn app.main:create_app --factory --app-dir services/backend --host 127.0.0.1 --port 8000 --no-access-log
```

访问 [存活检查](http://127.0.0.1:8000/health/live)、[API 文档](http://127.0.0.1:8000/docs) 或 [OpenAPI](http://127.0.0.1:8000/openapi.json)。GET 存活检查返回统一 JSON，data 为 `{"status":"ok"}`；HEAD 只返回响应头。此阶段尚无业务路由；存活检查不连接数据库，`/health/ready` 仍待 S05 实现。

普通 JSON 使用 code/msg/data/traceId；损坏 JSON 返回 400，字段错误返回 422，未处理异常返回安全的 500。响应头 X-Trace-Id、正文和服务端请求日志使用同一 ID；外部传入的追踪头不被直接采信。CORS 向配置来源开放追踪头、Location 和 Retry-After，支持 REST 方法及认证/幂等请求头。

应用日志只记录路由模板等必要信息，不记录完整 URL/query、请求体或异常中的私密原文。启动命令禁用 Uvicorn 原始访问日志。框架文档、CORS 预检、SSE/下载与无体响应保留各自协议；流开始后的异常中断传输，不再追加 JSON。详细验证见 [S04 记录](../../doc/validation/T1-api.md)。

`DATABASE_URL` 使用 `SecretStr`，配置打印与序列化均脱敏；校验错误隐藏输入值。只有创建数据库引擎时才取原值，不能将它写入日志或 API 响应。Pydantic 的 `ValidationError.errors()` 仍可能携带原始输入，禁止直接打印或返回该结构；需要结构化错误时必须显式排除输入与上下文。

## 检查

从仓库根目录执行：

```sh
pnpm lint:python
pnpm test:backend
```

或直接使用 Python 工具：

```sh
uv run --frozen --project services/backend ruff check services/backend
uv run --frozen --project services/backend ruff format --check services/backend
uv run --frozen --project services/backend pytest services/backend/tests -q
```

测试隔离环境文件和相关进程变量，仅使用合成连接串，不连接数据库。当前共 52 项测试，覆盖配置/工厂、响应契约、错误脱敏、并发追踪、CORS、无体响应、流中断与存活检查；测试故障路由不注册到正式应用。
