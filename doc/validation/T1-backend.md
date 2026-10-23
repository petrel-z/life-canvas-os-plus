# T1 · S03 后端入口与配置验证

日期：2026-10-22（Asia/Shanghai）。依据：[S03 实施清单](../ENGINEERING_BOOTSTRAP_PLAN.md#s03建立后端入口和配置边界)、[S01 版本基线](T1-environment.md)。

**状态：S03 完成。** 已建立可启动的 FastAPI 工厂、环境配置、依赖锁与后端检查。S04 统一响应/追踪及 S05 数据库连接仍待实施，整个 T1 未完成。

## 1. 提交与工具

- 按用户“先提交代码，再继续”的要求，先提交此前的需求、UI 原型和 S01/S02 成果：`e8bde27`，`chore: initialize workspace with product specs and UI prototypes`。提交后确认工作区干净，再实施 S03。没有配置远程或推送；本记录及 S03 改动于 2026-10-23 复验后提交为 `b3775f7`。
- uv **0.13.5** 使用官方 PyPI macOS arm64 wheel，校验包元数据中的 SHA-256 后放入被忽略的 `.tools/`，由 `.tools/bin/uv` 选择。
- uv 管理的 Python **3.12.15 arm64** 位于 `.tools/python/`；后端独立环境位于 `services/backend/.venv/`，实测解释器版本与架构一致。未修改系统 Python、全局 uv 或 shell 配置。
- 首次大文件下载遇到超时和连接中断，使用官方来源分段下载后完成安装；后续 uv 下载临时设置 `UV_HTTP_TIMEOUT=900`。没有更换项目依赖源或降低版本。

## 2. 依赖与文件

`services/backend/pyproject.toml` 约束 Python `>=3.12,<3.13`，要求 uv `==0.13.5`。`uv.lock` 由 uv 解析官方 PyPI 生成，共 35 个跨平台解析条目，本机安装 32 个包；主要版本如下：

| 依赖 | 锁定版本 |
| --- | --- |
| FastAPI / Starlette | 0.159.1 / 1.9.0 |
| Pydantic / pydantic-settings | 2.14.1 / 2.16.1 |
| SQLAlchemy | 2.0.55 |
| psycopg / psycopg-binary | 3.3.6 / 3.3.6 |
| Alembic | 1.20.1 |
| Uvicorn | 0.54.0 |
| pytest / httpx | 9.1.1 / 0.28.1 |
| Ruff | 0.17.1 |

| 文件 | 行为 |
| --- | --- |
| `services/backend/app/core/config.py` | `Settings`、`load_settings()`；校验 APP_ENV、DATABASE_URL、CORS_ORIGINS，连接串脱敏 |
| `services/backend/app/main.py` | `create_app(settings=None)`；启动前加载并校验配置，支持显式注入 |
| `services/backend/tests/` | 隔离进程变量/环境文件的配置测试与应用请求测试 |
| 根 `.env.example` | 仅含占位符，说明服务端配置与后续独立迁移连接 |
| 根 `package.json` | 添加后端启动、测试、Ruff 检查与格式化；根 lint 串联 Biome/Ruff |
| 根与后端 `README.md` | 工具选择、冻结安装、配置、启动与检查方法 |

## 3. 配置约束

- 环境文件固定为仓库根 `.env`，与启动 cwd 无关；进程环境优先，显式 `Settings` 字段优先于环境。读取不缓存。
- `DATABASE_URL` 必填，限定 PostgreSQL/psycopg 3，要求主机、数据库名和合法端口；普通 `postgresql://` 规范化为 `postgresql+psycopg://`，保留密码编码与查询参数。
- 连接串使用 `SecretStr`；配置 repr、序列化与异常文本隐藏密码。解析错误使用固定说明，不串联可能包含原始连接串的解析器异常。
- `CORS_ORIGINS` 默认空列表，校验并规范化显式 HTTP(S) origin；拒绝通配、凭据、路径和查询等非 origin 内容。S03 只校验配置，S04 才接入中间件。
- 不要求 Auth、模型和 Worker 凭据；没有演示配置回退。未创建包含凭据的根 `.env`，实际启动验收使用合成进程变量。

Pydantic 的结构化 `ValidationError.errors()` 仍可能包含原始输入；后续日志/错误处理中不能直接打印或返回它，必须排除输入与上下文。当前启动异常文本已实测脱敏。

## 4. 验证结果

| 检查 | 实际结果 |
| --- | --- |
| 先失败、后实现 | 在工厂与配置尚未实现时，25 项测试均因 `NotImplementedError` 失败；完成实现后全部通过 |
| 配置与工厂测试 | `pnpm test:backend`：25 passed；另以 `-W error` 执行通过，无警告 |
| 代码检查 | `pnpm lint`：Biome 3 个配置通过；Ruff 规则/格式通过，覆盖 6 个 Python 文件与 pyproject.toml |
| 冻结安装 | `uv sync --project services/backend --frozen --python 3.12.15` 成功 |
| 锁文件一致性 | `uv lock --project services/backend --check --offline` 通过 |
| 安装兼容性 | `uv pip check --python services/backend/.venv/bin/python`：32 个已安装包兼容 |
| 真实服务启动 | 从不相关临时 cwd，以实际 Uvicorn factory 在 127.0.0.1:8000 启动；`/openapi.json`、`/docs` 均为 200 |
| 根启动入口 | `pnpm dev:backend` 实际执行文档中的 uv factory 命令，8000 端口返回正确 OpenAPI；测试后关闭自己创建的进程组 |
| 启动失败路径 | 缺 DATABASE_URL、错误端口分别启动失败并退出 1；错误指出 database_url，日志不含测试密码 |
| 响应与日志脱敏 | OpenAPI 响应、正常启动/退出日志及失败日志均不含合成数据库密码 |
| 文档与范围 | 8 份文档的 70 个本地链接有效；UI 相对基线无变更；新文件列表排除工具、虚拟环境与缓存，保留环境示例和 uv.lock |

测试请求使用 httpx `ASGITransport`；避开 Starlette 1.9 的旧 httpx TestClient 弃用路径，未屏蔽警告。真实启动另用独立子进程验证，结束时只关闭该测试进程。

## 5. 交接边界

当前验证不连接 PostgreSQL，没有业务路由、统一响应、traceId、CORS 中间件或迁移。没有启动 Docker、模拟器或改动 UI 原型服务。下一步 S04：统一 `code/msg/data/traceId`、HTTP 状态、错误处理、请求追踪和存活检查。
