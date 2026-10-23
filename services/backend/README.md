# Life Canvas 后端

S03 提供 FastAPI 应用工厂、环境配置与校验；S04 接入统一响应、异常处理、请求追踪、CORS 和存活检查；S05 接入 PostgreSQL 异步连接池、就绪检查与 Alembic 基线迁移。业务接口按后续任务实施。

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
| `MIGRATION_DATABASE_URL` | Alembic 必填，单独校验和读取；API 启动不要求此变量，迁移也不要求 API 配置有效 |
| `TEST_DATABASE_URL` | 仅真实数据库测试需要，须有 CREATEDB 权限；不会作为 API 或迁移的默认值 |
| `CORS_ORIGINS` | JSON 数组，如 `["http://localhost:5173"]`；默认空列表，仅接受不带认证、路径、查询或片段的 HTTP(S) origin |

根 `.env` 的位置由源码定位，不随启动工作目录改变。优先级为：显式注入 `Settings` 字段 → 进程环境变量 → 根 `.env` → 字段默认值。读取配置不缓存，缺少必需项或格式错误会阻止启动；不回退到演示配置。当前阶段不要求 Auth、模型或 Worker 凭据。

```sh
pnpm dev:backend
```

等价命令：

```sh
uv run --frozen --project services/backend uvicorn app.main:create_app --factory --app-dir services/backend --host 127.0.0.1 --port 8000 --no-access-log
```

访问 [存活检查](http://127.0.0.1:8000/health/live)、[就绪检查](http://127.0.0.1:8000/health/ready)、[API 文档](http://127.0.0.1:8000/docs) 或 [OpenAPI](http://127.0.0.1:8000/openapi.json)。两项健康接口均支持 GET/HEAD：成功 JSON 的 data 为 `{"status":"ok"}`，HEAD 只返回响应头。

`live` 不访问数据库。`ready` 通过 SQLAlchemy async engine/psycopg 3 执行 `SELECT 1`，池等待、连接和探测共享 2 秒超时；数据库不可用返回 HTTP/code 503，data 为 `{"reason":"DATABASE_UNAVAILABLE"}`，保留请求 traceId。调用方取消会继续传播。它仅验证数据库连接，不检查业务表或 Supabase Auth/Storage。

连接池在应用 lifespan 中创建、关闭时释放，创建时不连库；数据库暂时离线不会阻止 API 启动。池最多 5 个常驻连接和 5 个临时连接，启用取连接前的存活探测，数据库恢复后可重连。超时响应不等待驱动的取消握手；取消中的探测按引擎跟踪并在关闭时清理。生成 OpenAPI 不运行 lifespan，也不连接数据库。

先按 [infra/README.md](../../infra/README.md) 配置并启动 PostgreSQL，再在本目录执行 `uv run --frozen alembic upgrade head` 和 `uv run --frozen alembic current`。迁移独立读取根 `.env` 的 `MIGRATION_DATABASE_URL`，不使用运行凭据兜底；URL 直接交给引擎，避免 `%` 编码被 INI 插值。基线 `0000_baseline` 无业务表，API 不自动迁移。S05 本机暂用 bootstrap 角色，T2 再完成运行/迁移权限分离与 RLS。

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

配置和协议测试隔离本地运行/迁移凭据。完整测试还使用 `TEST_DATABASE_URL` 创建独立临时 PostgreSQL 数据库，验证迁移升级→回退→再升级、已有数据保留、池恢复和退出释放；缺少测试数据库时明确失败。完整测试 66 项，另含建连/已有连接/池等待的两秒超时、取消、并发存活检查、错误脱敏与 OpenAPI；测试故障路由不注册到正式应用。运行及证据见 [S05 记录](../../doc/validation/T1-database.md)。
