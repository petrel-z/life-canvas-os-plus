# S05：PostgreSQL、就绪检查与迁移验证

日期：2026-10-23。范围为[工程骨架计划 S05](../ENGINEERING_BOOTSTRAP_PLAN.md#s05接通-postgresql就绪检查和迁移)，直接在本地 `dev` 实施。起点为 `80cbc7b`；S01–S04 与分支规范已经提交。

## 交付与边界

| 入口 | 输入、处理和输出 |
| --- | --- |
| [Compose](../../infra/compose.yaml) | 根 `.env` 的 POSTGRES 变量 → PostgreSQL 17.11/独立数据卷 → 仅 `127.0.0.1:54322` 可访问，提供容器 healthcheck |
| [配置](../../services/backend/app/core/config.py) | API 和迁移分别读取 `DATABASE_URL`、`MIGRATION_DATABASE_URL`；共用 PostgreSQL URL 校验/psycopg 归一化，凭据以 SecretStr 保存，无相互回退 |
| [应用 lifespan](../../services/backend/app/main.py) | 启动时创建惰性引擎；请求使用同一连接池；退出时清理未完成探测并释放连接池。创建应用/OpenAPI 不连接数据库 |
| [数据库能力](../../services/backend/app/core/db.py) | psycopg 3 异步引擎，5 个池连接、最多 5 个额外连接、取连接前探测；`SELECT 1` 与池等待/建连共享 2 秒响应截止时间 |
| [健康路由](../../services/backend/app/health.py) | GET/HEAD `/health/live` 不依赖数据库；`/health/ready` 可用时 200，失败或超时 503，`data.reason=DATABASE_UNAVAILABLE`；响应头、正文与日志 traceId 一致 |
| [迁移环境](../../services/backend/alembic/env.py) | 独立迁移配置 → 临时异步引擎/NullPool → Alembic 事务；配置或连接失败明确退出，不打印驱动异常原文或密码 |
| [迁移基线](../../services/backend/alembic/versions/0000_baseline.py) | 建立 `0000_baseline` 版本记录；不创建业务表，不自动迁移，不使用模型建表代替迁移 |

超时处理区分“返回响应”与“释放驱动连接”：psycopg 的取消握手可能继续等待远端响应，因此 `ready` 到期即返回 503，取消中的探测按引擎保留引用并在结束后移除；应用退出会等待清理再释放池。调用方取消保持原有取消语义。数据库错误和后台清理异常只输出安全类型信息，不输出原始连接串。

本机 `.env` 本次首次创建，权限为 0600，密码随机生成，文件被 Git 忽略。S05 使用本地 bootstrap 角色；运行/迁移角色隔离、身份事务、RLS、Auth/Storage 和业务表属于 T2 及以后，未标记完成。Supabase 云项目 major 尚未核实；本地版本选择仍以 [S01 记录](T1-environment.md) 为依据。

## 自动化证据

项目工具：Node 24.22.1、pnpm 10.30.3、Python 3.12.15、uv 0.13.5；Docker Engine 29.1.3 / Compose 5.0.1。数据库实际返回 `17.11 (Debian 17.11-1.pgdg12+2)`。沿用原有 Python 依赖与锁文件，没有新增依赖。

| 验证 | 实际结果 |
| --- | --- |
| 新测试先运行 | 14 项失败、1 项通过；失败来自未实现的 ready、数据库池与迁移配置/入口 |
| `pnpm test:backend` | 最终 **66 passed in 14.27s**，原有 52 项行为继续通过 |
| `pnpm lint` | Biome 3 个配置文件通过；Ruff check/format 通过，19 个 Python 文件符合格式 |
| Compose 配置/启动 | `config --quiet`、`up -d` 成功；独立 `life-canvas-postgres-1` 健康，仅绑定回环端口 |
| 后端目录 `uv run --frozen alembic upgrade head` / `current` | 成功迁移，显示 `0000_baseline (head)` |
| 真实临时库迁移 | 空库只有 `alembic_version`；升级→降到 base→再升级通过；测试已有数据保持不变 |
| 连接池与健康检查 | 正常连接、空闲连接被终止后的恢复、关闭时释放、池占满超时、调用取消、无响应 TCP 对端均通过 |
| 已建立连接后网络卡住 | 真实 PostgreSQL TCP 代理验证：旧实现超过 2.3 秒仍在等待取消；修复后按 2 秒截止返回 503，回归测试通过 |
| 配置、协议与脱敏 | 迁移不回退运行凭据；不依赖工作目录；错误不回显密码；ready 的 200/503 schema、HEAD、CORS 与 traceId 通过 |

[集成测试](../../services/backend/tests/integration/test_database.py) 通过 `TEST_DATABASE_URL` 创建随机临时库，不迁移或清理控制库、开发库；结束后仅删除自己创建的库。缺少数据库配置或连接失败会使完整测试失败，不通过 skip 隐藏。运行方法见 [infra/README.md](../../infra/README.md)。

实现期间定位并修正了测试服务的清理顺序：Python 3.12 的 TCP server `wait_closed()` 会等待连接关闭，测试现先关闭流、再等待 server 退出。该问题不通过延长产品超时规避。

## 真实 HTTP 停止与恢复

在超时边界修复后再次使用独立 Uvicorn 子进程验证，实际监听 `127.0.0.1:64650`；从临时工作目录启动，读取项目根配置。操作仅针对本次创建的 `life-canvas` Compose 服务，没有删除数据卷。

| 操作 | 结果 | 同次响应/日志 traceId |
| --- | --- | --- |
| PostgreSQL 运行，GET ready | 200 | `74d5c37c74f44da6bd604002b242f25a` |
| `stop postgres` 后 GET ready | 503 / DATABASE_UNAVAILABLE | `badbf108060f4105b7d8f03c610fd175` |
| 停库时 GET live | 200 | `6cf7605ce92146d19992b99853cb5215` |
| `start postgres`，同一 API 进程 GET ready | 200 | `57a3da256b9944b19b521eb3b472db49` |

另检查 HEAD ready 的 503 无响应体、OpenAPI 正常、数据库密码不出现在服务日志、重启后基线版本保留，随机测试库残留数为 0。验证结束后退出测试 API，保留本机数据库运行。

## 复核与下一步

本轮按用户要求在 `dev` 开发，无功能分支、合并或推送。当前为侧边会话，按限制由同一实现者执行独立自查，未调用子代理。复核中发现的驱动取消延长响应问题已通过“先失败、后修复、完整回归”处理；其余 S05 验收项通过。

下一步是 S06：导出 OpenAPI，生成共享客户端类型与健康请求函数；本次未提前实施。

实现依据：[SQLAlchemy 异步引擎与释放](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)、[Alembic 异步迁移](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic)、[psycopg 异步连接](https://www.psycopg.org/psycopg3/docs/advanced/async.html)。运行时具体行为同时检查本项目锁定版本源码并用真实数据库验证。
