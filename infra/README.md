# 本地 PostgreSQL

S05 使用固定镜像 `postgres:17.11-bookworm`，只绑定 `127.0.0.1:54322`。这是 PostgreSQL 数据库，不包含 Supabase Auth/Storage；版本选择与云环境待对齐项见 [S01 记录](../doc/validation/T1-environment.md)。

## 配置与启动

从仓库根目录执行。首次将 [`.env.example`](../.env.example) 复制为 `.env`；已有文件只补充缺失项。自行生成密码，替换所有 `CHANGE_ME`，确保以下变量对应同一数据库：

| 变量 | 使用方 |
| --- | --- |
| `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` | Compose 首次初始化本机数据卷 |
| `DATABASE_URL` | API 运行时连接 |
| `MIGRATION_DATABASE_URL` | Alembic 独立迁移连接；不回退到 API 连接 |
| `TEST_DATABASE_URL` | pytest 控制连接，要求 CREATEDB；建议指向本地 `postgres` 库 |

URL 中的密码需 URL 编码；`POSTGRES_PASSWORD` 使用原始密码。S05 本机使用 bootstrap 角色完成连接与迁移验收；受限运行角色、身份事务及 RLS 在 T2 创建，当前配置不是生产账号隔离方案。

```sh
docker compose --env-file .env -f infra/compose.yaml config --quiet
docker compose --env-file .env -f infra/compose.yaml up -d
docker compose --env-file .env -f infra/compose.yaml ps
```

Compose 项目名为 `life-canvas`，数据卷为 `life-canvas_postgres-data`。若端口已被占用，先检查占用服务并同步调整 Compose 与三条连接串。已有数据卷不会因修改 `.env` 而重设用户、密码或数据库。

## 迁移

按[根 README](../README.md) 设置工具 PATH、uv 缓存路径后，进入后端目录：

```sh
cd services/backend
uv run --frozen alembic upgrade head
uv run --frozen alembic current
```

当前 head 为 `0000_baseline`，只产生 `alembic_version` 中的版本记录，无业务表。应用启动不会自动迁移；未来 T2 的 `0001_identity` 接续此基线。也可在任意目录用 `alembic -c /绝对路径/services/backend/alembic.ini ...`，配置位置和根 `.env` 不依赖工作目录。

## 测试与故障恢复

回到仓库根目录，数据库运行时执行：

```sh
pnpm test:backend
```

集成测试从 `TEST_DATABASE_URL` 连接控制库，每个用例创建随机的 `life_canvas_test_<uuid>` 数据库，测试只在该临时库中迁移、回退或终止连接，结束后删除自己创建的库。缺少配置或数据库不可用会明确失败，不跳过数据库验收。不迁移或删除控制库、开发库，也不删除数据卷。若测试进程被强制终止，可能留下以该前缀命名的临时库，应核对归属后清理。

仅检查不需要 PostgreSQL 的用例时，可明确选择：

```sh
uv run --frozen --project services/backend pytest services/backend/tests -m 'not integration' -q
```

这不能替代完整集成验收。验证真实停止/恢复时，先确保没有测试运行，启动 API，再执行以下命令并访问 `/health/ready`：

```sh
docker compose --env-file .env -f infra/compose.yaml stop postgres
# ready 返回 503 / DATABASE_UNAVAILABLE，live 继续返回 200。
docker compose --env-file .env -f infra/compose.yaml start postgres
# 等待数据库恢复后 ready 返回 200，无须重启 API。
```

普通停止使用 `stop`，保留数据卷。健康接口只验证进程或数据库连接，不代表业务迁移、认证、RLS 和云端服务已就绪。
